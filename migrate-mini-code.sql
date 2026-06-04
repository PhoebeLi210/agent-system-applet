-- 数据库迁移：为agents表添加mini_code_url字段

-- 创建新表
CREATE TABLE IF NOT EXISTS agents_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_code TEXT UNIQUE NOT NULL,
    agent_name TEXT NOT NULL,
    scene_id INTEGER UNIQUE NOT NULL,
    qrcode_url TEXT,
    mini_code_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 复制数据
INSERT INTO agents_new (id, agent_code, agent_name, scene_id, qrcode_url, created_at)
SELECT id, agent_code, agent_name, scene_id, qrcode_url, created_at FROM agents;

-- 删除旧表
DROP TABLE agents;

-- 重命名新表
ALTER TABLE agents_new RENAME TO agents;

-- 重新创建索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_agent_code ON agents(agent_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_scene_id ON agents(scene_id);