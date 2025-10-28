import { App, Editor, MarkdownView, Notice, Platform } from "obsidian";

const CHATGPT_BASE_URL = "https://chat.openai.com";

const removeFrontmatter = (content: string): string => {
  const normalized = content.replace(/\r\n?/g, "\n");
  const sanitized = normalized.replace(/^\ufeff/, "");

  if (!sanitized.startsWith("---")) {
    return content;
  }

  const lines = sanitized.split("\n");

  if (lines[0].trim() !== "---") {
    return content;
  }

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed === "---" || trimmed === "...") {
      return lines.slice(index + 1).join("\n");
    }
  }

  return content;
};

type ExecOptions = import("child_process").ExecFileOptions & {
  encoding?: BufferEncoding | null;
};

let execFileRef: ((
  file: string,
  args: readonly string[] | undefined,
  options: ExecOptions | undefined,
  callback: (
    error: import("child_process").ExecFileException | null,
    stdout: string | Buffer,
    stderr: string | Buffer
  ) => void
) => void) | null = null;

const ensureExecFile = async () => {
  if (execFileRef) {
    return execFileRef;
  }

  const module = await import("child_process");
  execFileRef = module.execFile;
  return execFileRef;
};

const execFileOutput = async (
  file: string,
  args: string[],
  options?: ExecOptions
): Promise<{ stdout: string; stderr: string }> => {
  const execFileFn = await ensureExecFile();
  const execOptions: ExecOptions = {
    ...(options ?? {}),
    encoding: (options?.encoding ?? "utf8") as BufferEncoding | null,
  };

  return new Promise((resolve, reject) => {
    execFileFn(file, args, execOptions, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        stdout: typeof stdout === "string" ? stdout : stdout.toString("utf8"),
        stderr: typeof stderr === "string" ? stderr : stderr.toString("utf8"),
      });
    });
  });
};

const tokenizeCommand = (command: string): string[] => {
  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];

    if (char === "\\") {
      const next = command[index + 1];

      if (next === '"' || next === "\\") {
        current += next;
        index += 1;
        continue;
      }
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && /\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }

      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
};

const getMacDefaultBrowserBundleId = async (): Promise<string | null> => {
  try {
    const homeDirectory = process.env.HOME;

    if (!homeDirectory) {
      return null;
    }

    const plistPath = `${homeDirectory}/Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure`;
    const { stdout } = await execFileOutput("plutil", [
      "-convert",
      "json",
      "-o",
      "-",
      plistPath,
    ]);
    const data = JSON.parse(stdout) as {
      LSHandlers?: Array<Record<string, string>>;
    };

    const handler = data?.LSHandlers?.find(
      (item) => item.LSHandlerURLScheme === "https"
    );

    if (!handler) {
      return null;
    }

    const bundleId = handler.LSHandlerRoleAll ?? handler.LSHandlerRoleViewer;

    return typeof bundleId === "string" && bundleId.trim() ? bundleId.trim() : null;
  } catch (error) {
    console.error("Mondo: Unable to determine macOS default browser", error);
    return null;
  }
};

const openUrlOnMac = async (url: string): Promise<boolean> => {
  try {
    const defaultBundle = await getMacDefaultBrowserBundleId();
    const bundleCandidates = defaultBundle ? [defaultBundle] : [];
    const fallbackBundles = [
      "com.apple.Safari",
      "com.google.Chrome",
      "company.thebrowser.Browser",
      "com.brave.Browser",
      "com.microsoft.edgemac",
    ];
    const appCandidates = [
      "Safari",
      "Arc",
      "Google Chrome",
      "Brave Browser",
      "Microsoft Edge",
    ];

    for (const bundle of [...bundleCandidates, ...fallbackBundles]) {
      try {
        if (!bundle) {
          continue;
        }

        await execFileOutput("open", ["-b", bundle, url]);
        return true;
      } catch (error) {
        continue;
      }
    }

    for (const app of appCandidates) {
      try {
        await execFileOutput("open", ["-a", app, url]);
        return true;
      } catch (error) {
        continue;
      }
    }
  } catch (error) {
    console.error("Mondo: Unable to open ChatGPT in macOS browser", error);
  }

  return false;
};

const getWindowsDefaultBrowserCommand = async (): Promise<string | null> => {
  try {
    const { stdout: progIdOutput } = await execFileOutput("reg", [
      "query",
      "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\https\\UserChoice",
      "/v",
      "ProgId",
    ], {
      windowsHide: true,
    });
    const progIdMatch = progIdOutput.match(/ProgId\s+REG_SZ\s+([^\r\n]+)/i);
    const progId = progIdMatch ? progIdMatch[1]?.trim() : null;

    if (!progId) {
      return null;
    }

    const registryKey = `HKEY_CLASSES_ROOT\\${progId}\\shell\\open\\command`;
    const { stdout: commandOutput } = await execFileOutput("reg", [
      "query",
      registryKey,
      "/ve",
    ], {
      windowsHide: true,
    });
    const commandMatch = commandOutput.match(/REG_SZ\s+([^\r\n]+)/i);
    const command = commandMatch ? commandMatch[1]?.trim() : null;

    return command && command.length > 0 ? command : null;
  } catch (error) {
    console.error("Mondo: Unable to determine Windows default browser", error);
    return null;
  }
};

const openUrlOnWindows = async (url: string): Promise<boolean> => {
  try {
    const commandLine = await getWindowsDefaultBrowserCommand();

    if (commandLine) {
      const tokens = tokenizeCommand(commandLine);

      if (tokens.length > 0) {
        const [executable, ...rawArgs] = tokens;
        const args = rawArgs
          .map((arg) => arg.replace(/%1|%l|%L/gi, url))
          .filter((arg) => arg.length > 0);

        if (!args.some((arg) => arg.includes(url))) {
          args.push(url);
        }

        try {
          await execFileOutput(executable, args, { windowsHide: true });
          return true;
        } catch (error) {
          console.error("Mondo: Unable to launch default Windows browser", error);
        }
      }
    }

    try {
      await execFileOutput("rundll32", ["url.dll,FileProtocolHandler", url], {
        windowsHide: true,
      });
      return true;
    } catch (error) {
      console.error("Mondo: rundll32 fallback failed", error);
    }
  } catch (error) {
    console.error("Mondo: Unable to open ChatGPT in Windows browser", error);
  }

  return false;
};

const openUrlOnLinux = async (url: string): Promise<boolean> => {
  const launchers = ["xdg-open", "gio", "gnome-open", "kde-open", "sensible-browser"];

  for (const launcher of launchers) {
    try {
      await execFileOutput(launcher, [url]);
      return true;
    } catch (error) {
      continue;
    }
  }

  return false;
};

const openChatGPTLink = async (url: string): Promise<boolean> => {
  if (Platform.isDesktopApp && typeof process !== "undefined") {
    try {
      if (process.platform === "darwin") {
        const opened = await openUrlOnMac(url);

        if (opened) {
          return true;
        }
      } else if (process.platform === "win32") {
        const opened = await openUrlOnWindows(url);

        if (opened) {
          return true;
        }
      } else {
        const opened = await openUrlOnLinux(url);

        if (opened) {
          return true;
        }
      }
    } catch (error) {
      console.error("Mondo: Failed to open ChatGPT link on desktop", error);
    }
  }

  if (typeof window !== "undefined" && typeof window.open === "function") {
    window.open(url, "_blank", "noopener");
    return true;
  }

  if (typeof globalThis.open === "function") {
    globalThis.open(url, "_blank");
    return true;
  }

  return false;
};

export const sendToChatGPT = async (
  app: App,
  options: {
    editor?: Editor;
    view?: MarkdownView | null;
    includeFrontmatter?: boolean;
  } = {}
): Promise<boolean> => {
  const view = options.view ?? app.workspace.getActiveViewOfType(MarkdownView);

  if (!view) {
    new Notice("Open a markdown note to send to ChatGPT.");
    return false;
  }

  const editor = options.editor ?? view.editor;

  if (!editor) {
    new Notice("Focus a markdown editor to send to ChatGPT.");
    return false;
  }

  const selection = editor.getSelection();
  let text = selection;

  const includeFrontmatter = options.includeFrontmatter !== false;

  if (!text) {
    const file = view.file;

    if (!file) {
      new Notice("Unable to read the note contents.");
      return false;
    }

    text = await app.vault.cachedRead(file);

    if (!includeFrontmatter) {
      text = removeFrontmatter(text);
    }
  }

  const normalizedText = text.replace(/\r\n?/g, "\n");
  if (!normalizedText.trim()) {
    new Notice("Nothing to send to ChatGPT.");
    return false;
  }

  const url = `${CHATGPT_BASE_URL}?q=${encodeURIComponent(normalizedText)}`;
  const opened = await openChatGPTLink(url);

  if (!opened) {
    new Notice("Unable to open ChatGPT link.");
  }

  return opened;
};
