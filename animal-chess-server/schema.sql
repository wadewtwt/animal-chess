CREATE TABLE IF NOT EXISTS animal_chess_user (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(128) NOT NULL,
  unionid VARCHAR(128) DEFAULT NULL,
  nickname VARCHAR(128) NOT NULL DEFAULT '',
  avatar_url VARCHAR(512) NOT NULL DEFAULT '',
  total_points INT NOT NULL DEFAULT 0,
  week_continuous_sign_days INT NOT NULL DEFAULT 0,
  last_sign_in_date DATE DEFAULT NULL,
  last_login_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_animal_chess_user_openid (openid)
);

CREATE TABLE IF NOT EXISTS animal_chess_sign_in_record (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  week_start_date DATE NOT NULL,
  sign_in_date DATE NOT NULL,
  points_awarded INT NOT NULL DEFAULT 10,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_animal_chess_sign_once (user_id, sign_in_date),
  KEY idx_animal_chess_sign_week (user_id, week_start_date)
);

CREATE TABLE IF NOT EXISTS animal_chess_points_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  change_type VARCHAR(32) NOT NULL,
  points_delta INT NOT NULL,
  balance_after INT NOT NULL,
  remark VARCHAR(255) NOT NULL DEFAULT '',
  related_record_id BIGINT DEFAULT NULL,
  created_at DATETIME NOT NULL,
  KEY idx_animal_chess_points_user_created (user_id, created_at)
);
