import { useState, useEffect, useMemo } from "react";
import { Notice } from "obsidian";
import { useApp } from "@/hooks/use-app";
import { Icon } from "@/components/ui/Icon";
import { useEntityFile } from "@/context/EntityFileProvider";
import {
  migrateAllLegacyTypeKeys,
  hasLegacyTypeKeys,
} from "@/utils/migrateLegacyTypeKey";

export const DeprecatedTypeWarning = () => {
  const app = useApp();
  const { file } = useEntityFile();
  const [hasLegacy, setHasLegacy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check for legacy type keys on mount
  useEffect(() => {
    const checkForLegacy = async () => {
      try {
        const found = await hasLegacyTypeKeys(app);
        setHasLegacy(found);
      } catch (error) {
        console.error("DeprecatedTypeWarning: failed to check for legacy keys", error);
      }
    };

    void checkForLegacy();
  }, [app]);

  // Immediate local check for the current note (avoids race with global scan)
  const hasLegacyOnCurrent = useMemo(() => {
    const fm = file?.cache?.frontmatter as Record<string, unknown> | undefined;
    if (!fm) return false;
    const hasType = typeof (fm as any).type === "string";
    const hasMondo = typeof (fm as any).mondoType === "string";
    return hasType && !hasMondo;
  }, [file?.cache?.frontmatter]);

  const handleMigrate = async () => {
    setIsLoading(true);
    try {
      const count = await migrateAllLegacyTypeKeys(app);
      setHasLegacy(false);
      new Notice(`Migrated ${count} note(s) from "type" to "mondoType"`);
    } catch (error) {
      console.error(
        "DeprecatedTypeWarning: migration failed",
        error
      );
      new Notice("Migration failed. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasLegacy && !hasLegacyOnCurrent) {
    return null;
  }

  return (
    <div className="mb-3 flex items-start gap-3 rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] px-3 py-2">
      <Icon
        name="alert-circle"
        className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--text-warning)]"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-sm text-[var(--text-normal)]">
          <span className="font-medium">Deprecated attribute:</span> The{" "}
          <code className="rounded bg-[var(--background-primary)] px-1.5 py-0.5 text-xs font-mono">
            type
          </code>{" "}
          frontmatter key is deprecated. Use{" "}
          <code className="rounded bg-[var(--background-primary)] px-1.5 py-0.5 text-xs font-mono">
            mondoType
          </code>{" "}
          instead.
        </p>
        <button
          onClick={handleMigrate}
          disabled={isLoading}
          className="inline-flex w-fit items-center gap-1.5 rounded-md border border-[var(--interactive-accent)] bg-[var(--interactive-accent)] px-2.5 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Icon name="loader" className="h-3 w-3 animate-spin" />
              Migrating...
            </>
          ) : (
            <>
              <Icon name="zap" className="h-3 w-3" />
              Update all keys
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default DeprecatedTypeWarning;
