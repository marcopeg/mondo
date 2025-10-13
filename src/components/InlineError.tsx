export const InlineError = ({ message }: { message: string }) => {
  return <p style={{ color: "red" }}>Error: {message}</p>;
};
