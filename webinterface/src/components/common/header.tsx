import { ReactNode } from "react";

import GlowButton from "@/components/common/glow-button";

type Props = {
  title: string;
  buttonText: string;
  buttonIcon?: React.ReactNode;
  buttonOnClick: () => void;
  summary?: ReactNode;
};

export default function Header({
  title,
  buttonText,
  buttonIcon,
  buttonOnClick,
  summary,
}: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">{title}</h1>

        <GlowButton icon={buttonIcon} onClick={buttonOnClick}>
          {buttonText}
        </GlowButton>
      </div>

      {summary}
    </div>
  );
}
