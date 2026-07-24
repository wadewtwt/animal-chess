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
