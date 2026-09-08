import { useEffect } from "react";

type Props = {
  message: string;
  onDone: () => void;
};

export default function Toast({ message, onDone }: Props) {
  useEffect(() => {
    const id = window.setTimeout(onDone, 2800);
    return () => window.clearTimeout(id);
  }, [message, onDone]);

  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}
