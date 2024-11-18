DELETE FROM public.config
	WHERE "key"='storage.generate_thumbnails.image';

DELETE FROM public.config
  WHERE "key"='storage.generate_thumbnails.video';

DELETE FROM public.config
  WHERE "key"='storage.generate_thumbnails.audio';

DELETE FROM public.config
  WHERE "key"='storage.generate_seeking_thumbnails.enabled';

DELETE FROM public.config
  WHERE "key"='storage.generate_seeking_thumbnails.desired_frames';

DELETE FROM public.config
  WHERE "key"='storage.transcode_videos.enabled';

DELETE FROM public.config
  WHERE "key"='storage.transcode_videos.target_height';

DELETE FROM public.config
  WHERE "key"='storage.transcode_videos.target_bitrate';
