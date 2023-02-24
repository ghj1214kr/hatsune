export type Track = {
  track_no: number;
  title: string;
  artist: string;
  album: string;
  duration: number;
  path: string;
  mtime: number;
  playlist: string;
};

export type AlbumHeader = {
  isAlbumHeader: boolean;
  key: string;
  path: string;
  firstTrackPath: string;
  title: string;
  year: string;
};

export type Playlist = {
  loading: boolean;
  name: string;
  id: string;
  trackList: (Track | AlbumHeader)[];
};

export type Metadata = {
  mtime: number;
  title: string;
  artist: string;
  album: string;
  path: string;
  coverArt?: string;
};

export type TrackProperties =
  | Partial<{
      title: string;
      artist: string;
      albumartist: string;
      album: string;
      year: number;
      track_no: number;
      disk_no: number;
      genre: string[];
      composer: string;
      duration: number;
      tagTypes: string;
      lossless: boolean;
      container: string;
      codec: string;
      codecProfile: string;
      sampleRate: number;
      bitrate: number;
      path: string;
    }>
  | undefined;
