export const durationToTime = (duration: number) => {
  if (duration < 0) {
    return { min: 0, sec: 0, string: "0:00" };
  }
  const min = Math.floor(duration / 60);
  const sec = Math.round(duration) % 60;
  return {
    min,
    sec,
    string: `${min}:${sec.toLocaleString(undefined, { minimumIntegerDigits: 2 })}`,
  };
};
