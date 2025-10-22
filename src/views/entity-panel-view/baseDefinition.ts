import { CRMFileType, getCRMEntityConfig } from "@/types/CRMFileType";

export type CRMBaseFieldConfig = {
  property: string;
};

export type CRMBaseSortDirection = "ASC" | "DESC";

export type CRMBaseViewConfig = {
  id: string;
  name: string;
  type: "table";
  fields: CRMBaseFieldConfig[];
  sort?: {
    property: string;
    direction: CRMBaseSortDirection;
  };
};

export type CRMBaseDefinition = {
  id: string;
  name: string;
  dataset: {
    query: {
      op: "and";
      filters: Array<{
        type: "property";
        property: string;
        operator: "equals";
        value: string;
      }>;
    };
  };
  views: CRMBaseViewConfig[];
};

const normalizeColumnProperty = (column: string): string => {
  if (!column || column.trim().length === 0) {
    return "note.show";
  }

  if (column === "fileName" || column === "filename") {
    return "file.basename";
  }

  if (column.includes(".")) {
    return column;
  }

  return `note.${column}`;
};

const normalizeSortDirection = (
  direction: string | undefined
): CRMBaseSortDirection =>
  direction?.toLowerCase() === "desc" ? "DESC" : "ASC";

export const buildBaseDefinition = (
  entityType: CRMFileType
): CRMBaseDefinition => {
  const config = getCRMEntityConfig(entityType);
  const columns = config?.list?.columns?.length
    ? config.list.columns
    : ["show"];

  const fields = columns.map<CRMBaseFieldConfig>((column) => ({
    property: normalizeColumnProperty(column),
  }));

  const sortColumn = (() => {
    const requested = config?.list?.sort?.column;
    if (requested && columns.includes(requested)) {
      return requested;
    }
    return columns[0];
  })();

  const sort = {
    property: normalizeColumnProperty(sortColumn),
    direction: normalizeSortDirection(config?.list?.sort?.direction),
  };

  return {
    id: `crm-${entityType}`,
    name: config?.name ?? entityType,
    dataset: {
      query: {
        op: "and",
        filters: [
          {
            type: "property",
            property: "note.type",
            operator: "equals",
            value: entityType,
          },
        ],
      },
    },
    views: [
      {
        id: "table",
        name: config?.name ?? entityType,
        type: "table",
        fields,
        sort,
      },
    ],
  };
};
