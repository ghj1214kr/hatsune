export type LibraryTree = {
  text: string;
  path: string;
  meta: string;
  children: LibraryTree[];
};

export type Playlist = {
  name: string;
  uid: string;
  trackList: PlaylistItem[];
};

export type PlaylistItem = {
  playlist_uid: string;
  path: string;
  mtime: number;
  title: string;
  artist: string;
  album: string;
  year: number;
  track_number: number;
  disk: number;
  duration: number;
  bitrate: number;
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

declare module "alsong" {
  export function alsong(
    title: string,
    artist: string,
    option: {
      playtime: number;
      page: number;
    }
  ): Promise<
    {
      lyricId: number;
      playtime: number;
      title: string;
      artist: string;
      album: string;
      registerDate: Date;
    }[]
  >;
  export function alsong(music: string): Promise<{
    lyricId: number;
    playtime: number;
    title: string;
    artist: string;
    album: string;
    registerDate: Date;
  } | null>;
}
