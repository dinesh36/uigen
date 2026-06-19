import { useState } from "react";

interface Props {
  // define props here
}

export function ComponentName({ }: Props) {
  const [state, setState] = useState<string>("");

  return (
    <div className="p-4">
      {/* component content */}
    </div>
  );
}
