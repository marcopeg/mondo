import QuickEntity from "@/containers/QuickEntity";
import Button from "@/components/ui/Button";
import Stack from "@/components/ui/Stack";
import { Title } from "@/components/ui/Title";

type EntityPickerProps = {
  icon: string;
  title: string;
  type: string;
  placeholder?: string;
  onOpenList: () => void;
};

export const EntityPicker = ({
  icon,
  title,
  type,
  placeholder,
  onOpenList,
}: EntityPickerProps) => (
  <Stack direction="column" gap={1} m={0}>
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <Title icon={icon} title={title} />
      </div>
      <Button
        variant="link"
        icon="chevron-right"
        iconPosition="end"
        aria-label={`Open ${title} panel`}
        title={`Open ${title} panel`}
        onClick={onOpenList}
      >
        List all
      </Button>
    </div>
    <QuickEntity type={type} placeholder={placeholder} />
  </Stack>
);
