import { useCallback, useRef, useState } from "react";
import { Notice } from "obsidian";
import { useApp } from "@/hooks/use-app";
import Button from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import TextField from "@/components/ui/TextField";
import Stack from "@/components/ui/Stack";
import type Mondo from "@/main";
import {
  getTemplateForType,
  renderTemplate,
} from "@/utils/MondoTemplates";
import { MondoFileType } from "@/types/MondoFileType";
import { normalizeFolderPath } from "@/utils/normalizeFolderPath";

const ensureFolder = async (app: any, folderPath: string) => {
  if (!folderPath) return;
  const existing = app.vault.getAbstractFileByPath(folderPath);
  if (existing) return;
  const segments = folderPath.split("/");
  let current = "";
  for (const segment of segments) {
    current = current ? `${current}/${segment}` : segment;
    const present = app.vault.getAbstractFileByPath(current);
    if (!present) {
      // eslint-disable-next-line no-await-in-loop
      await app.vault.createFolder(current);
    }
  }
};

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const sanitizeFileName = (value: string): string =>
  value
    .replace(/[\\/]+/g, " ")
    .replace(/[:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();

type QuickTaskProps = {
  iconOnly?: boolean;
};

const QuickTask = ({ iconOnly = false }: QuickTaskProps) => {
  const app = useApp();
  const [quickLogText, setQuickLogText] = useState("");
  const [isLogging, setIsLogging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const handleQuickLog = useCallback(async () => {
    const trimmedQuickLog = quickLogText.trim();

    if (!trimmedQuickLog) {
      focusInput();
      return;
    }

    const plugin = (app as any).plugins?.getPlugin?.("mondo") as Mondo | undefined;
    if (!plugin) {
      new Notice("Mondo plugin is not ready yet");
      focusInput();
      return;
    }

    setIsLogging(true);
    try {
      const settings = (plugin as any)?.settings || {};
      const rootPaths = settings.rootPaths ?? {};
      const templates = (settings.templates ?? {}) as Partial<
        Record<MondoFileType, string>
      >;

      const folderSetting = rootPaths[MondoFileType.TASK] ?? "/";
      const normalizedFolder = normalizeFolderPath(folderSetting);

      if (normalizedFolder) {
        await ensureFolder(app, normalizedFolder);
      }

      const words = trimmedQuickLog.split(/\s+/).filter(Boolean);
      const truncatedTitle = words.slice(0, 10).join(" ");
      const baseTitle = truncatedTitle || trimmedQuickLog;
      const safeBase = sanitizeFileName(baseTitle) || "Untitled Task";
      const baseFileName = safeBase.endsWith(".md")
        ? safeBase
        : `${safeBase}.md`;

      const buildFilePath = (name: string) =>
        normalizedFolder ? `${normalizedFolder}/${name}` : name;

      let fileName = baseFileName;
      let filePath = buildFilePath(fileName);
      let counter = 1;

      while (app.vault.getAbstractFileByPath(filePath)) {
        const suffix = `-${counter}`;
        const nameWithoutExt = baseFileName.replace(/\.md$/i, "");
        fileName = `${nameWithoutExt}${suffix}.md`;
        filePath = buildFilePath(fileName);
        counter += 1;
      }

      const now = new Date();
      const iso = now.toISOString();
      const slug =
        slugify(baseTitle) || slugify(fileName.replace(/\.md$/i, "")) ||
        `task-${Date.now()}`;

      const templateSource = await getTemplateForType(
        app,
        templates,
        MondoFileType.TASK
      );

      let content = renderTemplate(templateSource ?? "", {
        title: baseTitle,
        mondoType: MondoFileType.TASK,
        type: MondoFileType.TASK,
        filename: fileName,
        slug,
        date: iso,
      });

      if (!content.trim()) {
        content = "---\n---\n";
      }

      if (!content.trimStart().startsWith("---")) {
        content = `---\n---\n${content.trimStart()}`;
      }

      const trimmedContent = content.trimEnd();
      const bodySection = `${trimmedContent}\n\n${trimmedQuickLog}\n`;

      const created = await app.vault.create(filePath, bodySection);

      await app.fileManager.processFrontMatter(created, (frontmatter) => {
        const fm = frontmatter as Record<string, unknown>;
        fm.mondoType = MondoFileType.TASK;
        if (Object.prototype.hasOwnProperty.call(fm, "type")) {
          delete fm.type;
        }
        fm.status = "quick";
        fm.participants = [];
        fm.date = iso;
      });

      setQuickLogText("");
      focusInput();
    } catch (error) {
      console.error("QuickTask: failed to create quick task note", error);
      new Notice("Failed to create quick task");
      focusInput();
    } finally {
      setIsLogging(false);
    }
  }, [app, focusInput, quickLogText]);

  return (
    <form
      className="w-full"
      onSubmit={(e) => {
        e.preventDefault();
        void handleQuickLog();
      }}
    >
      <Stack direction="row" align="center" gap={2} py={0}>
        <TextField
          ref={inputRef}
          className="setting-input flex-1 min-w-0"
          placeholder="Quick task..."
          value={quickLogText}
          onChange={(event) => setQuickLogText(event.target.value)}
          disabled={isLogging}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.stopPropagation();
              void handleQuickLog();
            }
          }}
        />
        <Button
          className={
            "mod-cta justify-center " + (iconOnly ? "w-10" : "w-12 sm:w-28")
          }
          type="submit"
          aria-label="Add task"
          disabled={isLogging || !quickLogText.trim()}
        >
          <Icon name="send" className="w-5 h-5 mr-0" />
          {!iconOnly && <span className="hidden sm:inline">Add Task</span>}
        </Button>
      </Stack>
    </form>
  );
};

export default QuickTask;
