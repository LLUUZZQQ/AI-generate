INSERT INTO trending_topics (id, title, description, category, heat_score, heat_history, status, platform_id, fetched_at) VALUES
  ('t1', '挑战30天早起', '连续30天早上6点起床打卡', 'challenge', 9500, '[{"time":"2026-05-09T12:00:00Z","score":8200},{"time":"2026-05-10T12:00:00Z","score":9500}]', 'peak', 'douyin_001', NOW()),
  ('t2', 'CityWalk北京胡同', '周末漫步北京老胡同探寻小店', 'hashtag', 7200, '[{"time":"2026-05-09T12:00:00Z","score":6500},{"time":"2026-05-10T12:00:00Z","score":7200}]', 'rising', 'douyin_002', NOW()),
  ('t3', 'AI绘图变身', '用AI把自己变成动漫角色', 'hashtag', 8800, '[{"time":"2026-05-09T12:00:00Z","score":7500},{"time":"2026-05-10T12:00:00Z","score":8800}]', 'rising', 'douyin_003', NOW()),
  ('t4', '翻唱夜曲2026', '周杰伦夜曲2026版翻唱挑战', 'music', 9100, '[{"time":"2026-05-09T12:00:00Z","score":9000},{"time":"2026-05-10T12:00:00Z","score":9100}]', 'peak', 'douyin_004', NOW()),
  ('t5', '五一旅游避坑指南', '五一假期旅游踩坑分享', 'event', 6800, '[{"time":"2026-05-09T12:00:00Z","score":5000},{"time":"2026-05-10T12:00:00Z","score":6800}]', 'rising', 'douyin_005', NOW()),
  ('t6', '沉浸式化妆', '安静化妆过程配治愈BGM', 'hashtag', 5400, '[{"time":"2026-05-09T12:00:00Z","score":5600},{"time":"2026-05-10T12:00:00Z","score":5400}]', 'falling', 'douyin_006', NOW()),
  ('t7', '花式跳绳挑战', '创意跳绳动作挑战赛全民参与', 'challenge', 7600, '[{"time":"2026-05-09T12:00:00Z","score":7000},{"time":"2026-05-10T12:00:00Z","score":7600}]', 'rising', 'douyin_007', NOW()),
  ('t8', '古风变装', '汉服变装视频一秒穿越千年', 'hashtag', 8300, '[{"time":"2026-05-09T12:00:00Z","score":8000},{"time":"2026-05-10T12:00:00Z","score":8300}]', 'rising', 'douyin_008', NOW()),
  ('t9', '我的年度BGM', '分享你今年最爱的BGM歌曲', 'music', 6200, '[{"time":"2026-05-09T12:00:00Z","score":5800},{"time":"2026-05-10T12:00:00Z","score":6200}]', 'rising', 'douyin_009', NOW())
ON CONFLICT (id) DO NOTHING;
