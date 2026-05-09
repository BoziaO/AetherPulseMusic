const { z } = require('zod');

const VideoIdSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{6,32}$/, 'Invalid videoId');

const PlaylistIdSchema = z
  .string()
  .trim()
  .regex(/^(?:VL)?[A-Za-z0-9_-]{6,128}$/, 'Invalid playlistId');

const ChannelIdSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{6,128}$/, 'Invalid channelId');

const SearchFilterSchema = z.enum([
  'songs',
  'videos',
  'albums',
  'artists',
  'playlists',
  'community_playlists',
  'featured_playlists',
  'uploads',
]);

const LimitSchema = z.coerce.number().int().min(1).max(100).default(20);
const LargeLimitSchema = z.coerce.number().int().min(1).max(500).default(25);

const SearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  filter: SearchFilterSchema.optional().nullable().or(z.literal('').transform(() => null)),
  limit: LimitSchema,
});

const SuggestionsQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
});

const HomeQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(3),
});

const ChannelParamsSchema = z.object({ channelId: ChannelIdSchema });
const AlbumParamsSchema = z.object({ browseId: PlaylistIdSchema });
const VideoParamsSchema = z.object({ videoId: VideoIdSchema });
const PlaylistParamsSchema = z.object({ playlistId: PlaylistIdSchema });

const PlaylistQuerySchema = z.object({ limit: LargeLimitSchema });

const WatchQuerySchema = z.object({
  videoId: VideoIdSchema,
  playlistId: PlaylistIdSchema.optional().nullable().or(z.literal('').transform(() => null)),
  limit: LargeLimitSchema,
  radio: z.union([z.literal('true'), z.literal('false')]).default('false'),
  shuffle: z.union([z.literal('true'), z.literal('false')]).default('false'),
});

const ChartsQuerySchema = z.object({
  country: z.string().trim().regex(/^[A-Z]{2}$/, 'country must be ISO-3166-1 alpha-2').default('ZZ'),
});

const MoodPlaylistsQuerySchema = z.object({
  params: z.string().trim().min(1).max(512),
});

const LibraryQuerySchema = z.object({ limit: LargeLimitSchema });

const LyricsQuerySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  videoId: VideoIdSchema.optional(),
  artist: z.string().trim().min(1).max(200).optional(),
  title: z.string().trim().min(1).max(200).optional(),
});

const TrackInputSchema = z.object({
  videoId: VideoIdSchema,
  title: z.string().trim().min(1).max(300),
  artist: z.string().trim().max(300).optional().default(''),
  thumbnail: z.string().trim().max(2048).optional().nullable(),
  duration: z.string().trim().max(20).optional().default(''),
});

const CreateLocalPlaylistBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional().default(''),
});

const AddPlaylistTrackBodySchema = TrackInputSchema;

const RemovePlaylistTrackBodySchema = z.object({
  videoId: VideoIdSchema,
});

const ImportYtPlaylistParamsSchema = z.object({
  playlistId: PlaylistIdSchema,
});

const CreateYtPlaylistBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional().default(''),
  privacyStatus: z.enum(['PRIVATE', 'PUBLIC', 'UNLISTED']).optional().default('PRIVATE'),
  videoIds: z.array(VideoIdSchema).max(500).optional().default([]),
});

const EditYtPlaylistBodySchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  privacyStatus: z.enum(['PRIVATE', 'PUBLIC', 'UNLISTED']).optional(),
});

const AddYtPlaylistTracksBodySchema = z
  .object({
    videoIds: z.array(VideoIdSchema).max(500).optional().default([]),
    sourcePlaylistId: PlaylistIdSchema.optional(),
    duplicates: z.boolean().optional().default(false),
  })
  .refine(
    (val) => (val.videoIds && val.videoIds.length > 0) || !!val.sourcePlaylistId,
    { message: 'videoIds or sourcePlaylistId required' },
  );

const RemoveYtPlaylistTracksBodySchema = z.object({
  videos: z.array(z.unknown()).min(1).max(500),
});

const ImportYouTubeBulkBodySchema = z
  .object({
    ids: z.array(z.string().trim().min(1).max(200)).max(200).optional(),
    all: z.boolean().optional(),
  })
  .refine(
    (val) => val.all === true || (Array.isArray(val.ids) && val.ids.length > 0),
    { message: 'ids[] or all=true required' },
  );

const RecentBodySchema = z.object({
  track: TrackInputSchema.passthrough(),
});

const FavoritesBodySchema = z.object({
  track: TrackInputSchema.passthrough(),
});

const SaveQueueBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  tracks: z.array(z.unknown()).max(250).optional().default([]),
});

const QueueParamsSchema = z.object({
  queueId: z.string().trim().min(1).max(64),
});

const FlowsBodySchema = z.object({
  preset: z.enum(['focus', 'energy', 'chill', 'discover']).optional().default('discover'),
  sessionMinutes: z.coerce.number().min(10).max(120).optional(),
  novelty: z.coerce.number().min(0).max(100).optional(),
  pool: z.array(z.unknown()).max(120).optional().default([]),
  recentTracks: z.array(z.unknown()).max(200).optional().default([]),
  favoriteTracks: z.array(z.unknown()).max(2000).optional().default([]),
});

const PageParamsSchema = z.object({
  key: z.enum([
    'home',
    'discover',
    'chill',
    'energy',
    'playlists',
    'albums',
    'artists',
    'favorites',
    'recent',
  ]),
});

const PageQuerySchema = z.object({
  recent: z.string().trim().max(2000).optional().default(''),
});

function formatZodError(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
}

function makeValidator(target) {
  return function validate(schema) {
    return (req, res, next) => {
      const result = schema.safeParse(req[target]);
      if (!result.success) {
        return res.status(400).json({
          error: 'Validation failed',
          target,
          details: formatZodError(result.error),
        });
      }
      req[target] = result.data;
      next();
    };
  };
}

const validateQuery = makeValidator('query');
const validateParams = makeValidator('params');
const validateBody = makeValidator('body');

module.exports = {
  z,
  validateQuery,
  validateParams,
  validateBody,
  formatZodError,
  schemas: {
    VideoIdSchema,
    PlaylistIdSchema,
    ChannelIdSchema,
    SearchFilterSchema,
    SearchQuerySchema,
    SuggestionsQuerySchema,
    HomeQuerySchema,
    ChannelParamsSchema,
    AlbumParamsSchema,
    VideoParamsSchema,
    PlaylistParamsSchema,
    PlaylistQuerySchema,
    WatchQuerySchema,
    ChartsQuerySchema,
    MoodPlaylistsQuerySchema,
    LibraryQuerySchema,
    LyricsQuerySchema,
    CreateLocalPlaylistBodySchema,
    AddPlaylistTrackBodySchema,
    RemovePlaylistTrackBodySchema,
    ImportYtPlaylistParamsSchema,
    CreateYtPlaylistBodySchema,
    EditYtPlaylistBodySchema,
    AddYtPlaylistTracksBodySchema,
    RemoveYtPlaylistTracksBodySchema,
    ImportYouTubeBulkBodySchema,
    RecentBodySchema,
    FavoritesBodySchema,
    SaveQueueBodySchema,
    QueueParamsSchema,
    FlowsBodySchema,
    PageParamsSchema,
    PageQuerySchema,
  },
};
