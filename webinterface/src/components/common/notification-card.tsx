import React from 'react';

interface NotificationCardProps {
  title: string;
  time: string;
  location: string;
  offset?: boolean;
  stackIndex?: number;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  title,
  time,
  location,
  offset = false,
  stackIndex = 0
}) => {
  const negativeMargin = `-${stackIndex * 28}px`;
  const zIndex = 50 - stackIndex;
  const scale = 1 - stackIndex * 0.05;

  return (
    <div
      className={`
        relative rounded-xl border border-zinc-700
        bg-zinc-800/60 backdrop-blur-sm
        p-4 text-white shadow-md
        ${offset ? 'z-0' : 'z-10'}
      `}
      style={{
        marginTop: stackIndex === 0 ? undefined : negativeMargin,
        zIndex,
        transform: `scale(${scale})`
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm leading-tight text-zinc-1000">
          {title}
        </span>

        <span className="shrink-0 text-xs text-zinc-400">
          {time}
        </span>
      </div>

      <div className="mt-1 text-xs text-zinc-300">
        {location}
      </div>
    </div>
  );
};

export default NotificationCard;
