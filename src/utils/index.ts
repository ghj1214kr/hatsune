export const durationStr = (duration: number) => {
  const min = Math.floor(duration / 60) + ":";
  let sec: number | string = Math.round(duration) % 60;
  if (sec < 10) {
    sec = "0" + sec;
  }
  return min + sec;
};

export const durationArray = (duration: number) => {
  const min = Math.floor(duration / 60).toString();
  let sec: number | string = Math.round(duration) % 60;
  if (sec < 10) {
    sec = "0" + sec;
  }
  return [min, sec.toString()];
};

export const shuffleIndexList = (indexList: number[]) => {
  for (let i = indexList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexList[i], indexList[j]] = [indexList[j], indexList[i]];
  }
  return indexList;
};

// const insertAlbumHeader = (library: PlaylistItem[], index: number): void => {
//   const trackObject = library[index];
//   if (trackObject !== null && trackObject.album !== null) {
//     library.splice(index, 0, {
//       ...trackObject,
//       path:
//         trackObject.path.substring(0, trackObject.path.lastIndexOf(sep)) +
//         trackObject.album,
//       isAlbumHeader: true,
//       firstTrackPath: trackObject.path,
//     });
//   }
// };

// export const buildLibraryPlaylist = (trackList: PlaylistItem[]) => {
//   const maxIndex = trackList.length - 1;
//   let pathAndAlbum =
//     dirname(trackList[maxIndex].path) + trackList[maxIndex].album;

//   for (let index = trackList.length - 1; index >= 0; index--) {
//     const currentPathAndAlbum =
//       dirname(trackList[index].path) + trackList[index].album;
//     if (pathAndAlbum !== currentPathAndAlbum) {
//       insertAlbumHeader(trackList, index + 1);
//       pathAndAlbum = currentPathAndAlbum;
//       if (index === 0) {
//         insertAlbumHeader(trackList, 0);
//       }
//     } else if (index === 0) {
//       insertAlbumHeader(trackList, 0);
//     }
//   }

//   return trackList;
// };

export const collator = new Intl.Collator("ja", {
  numeric: true,
  sensitivity: "base",
});

const timeRegex = /\[\d{2}:\d{2}\.\d{2}\]/;

export const lyricParser = (rawLyric: string) => {
  try {
    const { lyric }: { lyric: string } = JSON.parse(rawLyric);
    const lyricGroupByTime = lyric
      .split("<br>")
      .reduce((acc: Map<number, string>, line: string) => {
        const timeString = line.match(timeRegex)?.[0];
        if (timeString) {
          const timeArray = [...timeString.matchAll(/\d{2}/g)].map((match) =>
            parseInt(match[0])
          );
          const time = timeArray[0] * 60 + timeArray[1] + timeArray[2] / 100;
          if (time === 0) {
            return acc;
          }
          const lineWithoutTime = line.replace(timeString, "");
          acc.set(
            time,
            acc.has(time)
              ? acc.get(time) + "\n" + lineWithoutTime
              : lineWithoutTime
          );
        }
        return acc;
      }, new Map<number, string>());
    return lyricGroupByTime;
  } catch (_) {
    return new Map<number, string>();
  }
};
