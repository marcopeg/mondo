import { useCallback, useMemo, useState, type MouseEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { EntityLinksTable } from "@/components/EntityLinksTable";
import { useFiles } from "@/hooks/use-files";
import { useApp } from "@/hooks/use-app";
import { CRMFileType } from "@/types/CRMFileType";
import type { CRMEntityType } from "@/entities";
import type { TCachedFile } from "@/types/TCachedFile";
import { matchesAnyPropertyLink } from "@/utils/matchesAnyPropertyLink";
import { getEntityDisplayName } from "@/utils/getEntityDisplayName";
import { createDocumentForEntity } from "@/utils/createDocumentForEntity";

const PANEL_STATE_KEY = "documents";
const PAGE_SIZE = 5;

type DocumentsLinksProps = {
  file: TCachedFile;
  config: Record<string, unknown>;
};

type DocumentLinkRule = {
  matchProperties: string[];
  createProperties: string[];
  subtitle: (entityName: string) => string;
};

const toTitleCase = (value: string): string =>
  value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const buildDocumentLinkRule = (entityType: CRMEntityType): DocumentLinkRule | null => {
  if (entityType === "document") {
    return null;
  }

  const baseProperties = ["related", entityType];

  if (entityType === "person") {
    baseProperties.push("people", "participants");
  }
  if (entityType === "team") {
    baseProperties.push("teams");
  }
  if (entityType === "company") {
    baseProperties.push("companies");
  }

  const matchProperties = Array.from(
    new Set(
      baseProperties
        .map((property) => property.trim())
        .filter((property): property is string => property.length > 0)
    )
  );

  const createProperties = Array.from(
    new Set(
      ["related", entityType]
        .map((property) => property.trim())
        .filter((property): property is string => property.length > 0)
    )
  );

  const subtitle = (entityName: string) => {
    const label = toTitleCase(entityType);
    return entityName
      ? `Documents linked to ${entityName}`
      : `Documents linked to this ${label}`;
  };

  return { matchProperties, createProperties, subtitle };
};

const getDocumentCategory = (documentEntry: TCachedFile): string => {
  const frontmatter = documentEntry.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;
  if (!frontmatter) {
    return "";
  }

  const rawCategory = frontmatter.category;
  if (Array.isArray(rawCategory)) {
    return rawCategory
      .map((value) => String(value).trim())
      .filter((value) => value.length > 0)
      .join(", ");
  }

  if (typeof rawCategory === "string") {
    return rawCategory.trim();
  }

  return "";
};

type AttachmentInfo = {
  target: string;
  label: string;
};

const parseAttachmentValue = (value: unknown): AttachmentInfo | null => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = parseAttachmentValue(entry);
      if (parsed) {
        return parsed;
      }
    }
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  let raw = value.trim();
  if (!raw) {
    return null;
  }

  if (raw.startsWith("[[") && raw.endsWith("]]")) {
    raw = raw.slice(2, -2);
  }

  const [linkTarget, alias] = raw.split("|");
  const cleanedTarget = linkTarget.trim().split("#")[0];
  if (!cleanedTarget) {
    return null;
  }

  const label = alias?.trim() || cleanedTarget.split("/").pop() || cleanedTarget;
  return { target: cleanedTarget, label };
};

const getDocumentAttachment = (documentEntry: TCachedFile): AttachmentInfo | null => {
  const frontmatter = documentEntry.cache?.frontmatter as
    | Record<string, unknown>
    | undefined;
  if (!frontmatter) {
    return null;
  }

  const rawFile = frontmatter.file;
  return parseAttachmentValue(rawFile);
};

export const DocumentsLinks = ({ file, config }: DocumentsLinksProps) => {
  const app = useApp();
  const hostFile = file.file;
  const entityType = file.cache?.frontmatter?.type as CRMEntityType | undefined;

  if (!hostFile || !entityType) {
    return null;
  }

  const linkRule = useMemo(
    () => buildDocumentLinkRule(entityType),
    [entityType]
  );
  if (!linkRule || linkRule.matchProperties.length === 0) {
    return null;
  }

  const documents = useFiles(CRMFileType.DOCUMENT, {
    filter: useCallback(
      (candidate: TCachedFile) => {
        if (!candidate.file) {
          return false;
        }
        if (!hostFile) {
          return false;
        }
        return matchesAnyPropertyLink(
          candidate,
          linkRule.matchProperties,
          hostFile
        );
      },
      [hostFile, linkRule.matchProperties]
    ),
  });

  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => {
      const nameA = getEntityDisplayName(a).toLowerCase();
      const nameB = getEntityDisplayName(b).toLowerCase();
      if (nameA !== nameB) {
        return nameA.localeCompare(nameB);
      }
      const categoryA = getDocumentCategory(a).toLowerCase();
      const categoryB = getDocumentCategory(b).toLowerCase();
      return categoryA.localeCompare(categoryB);
    });
  }, [documents]);

  const collapsed = useMemo(() => {
    const crmState = (file.cache?.frontmatter as any)?.crmState;
    if (crmState?.[PANEL_STATE_KEY]?.collapsed === true) {
      return true;
    }
    if (crmState?.[PANEL_STATE_KEY]?.collapsed === false) {
      return false;
    }
    return (config as any)?.collapsed !== false;
  }, [file.cache?.frontmatter, config]);

  const handleCollapseChange = useCallback(
    async (isCollapsed: boolean) => {
      if (!hostFile) {
        return;
      }
      try {
        await app.fileManager.processFrontMatter(hostFile, (frontmatter) => {
          if (
            typeof (frontmatter as any).crmState !== "object" ||
            (frontmatter as any).crmState === null
          ) {
            (frontmatter as any).crmState = {};
          }
          const panelState = (frontmatter as any).crmState[PANEL_STATE_KEY];
          if (typeof panelState !== "object" || panelState === null) {
            (frontmatter as any).crmState[PANEL_STATE_KEY] = {};
          }
          (frontmatter as any).crmState[PANEL_STATE_KEY].collapsed = isCollapsed;
        });
      } catch (error) {
        console.error("DocumentsLinks: failed to persist collapse state", error);
      }
    },
    [app, hostFile]
  );

  const [isCreating, setIsCreating] = useState(false);

  const handleCreateDocument = useCallback(() => {
    if (isCreating) {
      return;
    }
    setIsCreating(true);
    (async () => {
      try {
        await createDocumentForEntity({
          app,
          entityFile: file,
          linkTargets: linkRule.createProperties.map((property) => ({
            property,
            mode: "list" as const,
            target: file,
          })),
        });
      } catch (error) {
        console.error("DocumentsLinks: failed to create document", error);
      } finally {
        setIsCreating(false);
      }
    })();
  }, [app, file, linkRule.createProperties, isCreating]);

  const actions = [
    {
      key: "document-create",
      content: (
        <Button
          variant="link"
          icon="plus"
          aria-label="Create document"
          disabled={isCreating}
          onClick={handleCreateDocument}
        />
      ),
    },
  ];

  const subtitle = linkRule.subtitle(getEntityDisplayName(file));

  return (
    <Card
      collapsible
      collapsed={collapsed}
      collapseOnHeaderClick
      icon="file-text"
      title="Documents"
      subtitle={subtitle}
      actions={actions}
      onCollapseChange={handleCollapseChange}
    >
      <EntityLinksTable
        items={sortedDocuments}
        getKey={(documentEntry) => documentEntry.file!.path}
        sortable={false}
        pageSize={PAGE_SIZE}
        emptyLabel="No documents linked"
        renderRow={(documentEntry) => {
          const documentFile = documentEntry.file!;
          const label = getEntityDisplayName(documentEntry);
          const category = getDocumentCategory(documentEntry);
          const attachment = getDocumentAttachment(documentEntry);

          const handleOpenAttachment = (event: MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            event.stopPropagation();
            if (!attachment) {
              return;
            }
            try {
              app.workspace.openLinkText(attachment.target, documentFile.path);
            } catch (error) {
              console.error(
                `DocumentsLinks: failed to open attachment "${attachment.target}"`,
                error
              );
            }
          };

          return (
            <>
              <Table.Cell className="px-2 py-2 align-top">
                <div className="flex flex-col gap-1">
                  <Button to={documentFile.path} variant="link">
                    {label}
                  </Button>
                  {category ? (
                    <span className="text-xs text-[var(--text-muted)]">
                      Category: {category}
                    </span>
                  ) : null}
                </div>
              </Table.Cell>
              <Table.Cell className="px-2 py-2 align-top text-right">
                {attachment ? (
                  <Button
                    variant="link"
                    icon="paperclip"
                    onClick={handleOpenAttachment}
                  >
                    {attachment.label}
                  </Button>
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">No attachment</span>
                )}
              </Table.Cell>
            </>
          );
        }}
      />
    </Card>
  );
};

export default DocumentsLinks;
