-- ==============================================================================
-- JARVES INTELLIGENT SYSTEM - COMPLETE DATABASE SCHEMA
-- Banco de Dados: emribeir_jarves
-- Compatibilidade: MySQL 5.7+ / MySQL 8.0+ / MariaDB 10.3+
-- Charset: utf8mb4 / Collation: utf8mb4_unicode_ci
-- Gerado para o Operador Mestre: Romildo (geoimoveissantos@gmail.com)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `emribeir_jarves`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `emribeir_jarves`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. TABELA DE USUÁRIOS E CONTAS DO SISTEMA
-- Armazena administradores e usuários comuns, senhas, papéis e permissões
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `username` VARCHAR(80) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `role` ENUM('Admin', 'User') NOT NULL DEFAULT 'User',
  `status` ENUM('Ativo', 'Suspenso') NOT NULL DEFAULT 'Ativo',
  `last_access` VARCHAR(100) DEFAULT NULL,
  `last_ip` VARCHAR(64) DEFAULT NULL,
  `action_logs_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `custom_settings` JSON DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_usuarios_email` (`email`),
  UNIQUE KEY `idx_usuarios_username` (`username`),
  KEY `idx_usuarios_role` (`role`),
  KEY `idx_usuarios_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. TABELA DE TRANSAÇÕES FINANCEIRAS
-- Entradas, saídas, receitas de consultoria, despesas operacionais
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `transacoes_financeiras`;
CREATE TABLE `transacoes_financeiras` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `description` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `type` ENUM('income', 'expense') NOT NULL,
  `category` VARCHAR(100) NOT NULL DEFAULT 'Geral',
  `date` VARCHAR(50) NOT NULL,
  `source` ENUM('voice', 'manual', 'api') NOT NULL DEFAULT 'manual',
  `status` VARCHAR(50) NOT NULL DEFAULT 'confirmado',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_trans_user` (`user_id`),
  KEY `idx_trans_type` (`type`),
  KEY `idx_trans_category` (`category`),
  CONSTRAINT `fk_transacoes_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. TABELA DE EVENTOS DO CALENDÁRIO & AGENDA
-- Reuniões, tarefas, consultas e lembretes executados pelo JARVES
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `eventos_agenda`;
CREATE TABLE `eventos_agenda` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `datetime` VARCHAR(100) NOT NULL,
  `category` ENUM('Reunião', 'Tarefa', 'Pessoal', 'Lembrete') NOT NULL DEFAULT 'Tarefa',
  `completed` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_eventos_user` (`user_id`),
  KEY `idx_eventos_category` (`category`),
  KEY `idx_eventos_completed` (`completed`),
  CONSTRAINT `fk_eventos_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. TABELA DE HÁBITOS E DISCIPLINA DIÁRIA
-- Rastreamento de rotinas, sequências (streaks) e metas diárias
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `habitos`;
CREATE TABLE `habitos` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `streak` INT UNSIGNED NOT NULL DEFAULT 0,
  `target` INT UNSIGNED NOT NULL DEFAULT 1,
  `completed_today` TINYINT(1) NOT NULL DEFAULT 0,
  `category` VARCHAR(100) NOT NULL DEFAULT 'Saúde',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_habitos_user` (`user_id`),
  CONSTRAINT `fk_habitos_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. TABELA DE PROJETOS E MILESTONES ESTRATÉGICAS
-- Metas de projetos, percentual de conclusão e prazos
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `projetos`;
CREATE TABLE `projetos` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `progress` INT UNSIGNED NOT NULL DEFAULT 0,
  `deadline` VARCHAR(100) NOT NULL,
  `status` ENUM('Em Andamento', 'Concluído', 'Pausado') NOT NULL DEFAULT 'Em Andamento',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_projetos_user` (`user_id`),
  KEY `idx_projetos_status` (`status`),
  CONSTRAINT `fk_projetos_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. TABELA DE CONFIGURAÇÃO DO WHATSAPP DE ORIGEM (GATEWAY & EVOLUTION API)
-- Telefone remetente, instâncias QR code, tokens e webhook
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `whatsapp_origem_config`;
CREATE TABLE `whatsapp_origem_config` (
  `id` VARCHAR(64) NOT NULL,
  `phone_number` VARCHAR(50) NOT NULL,
  `sender_name` VARCHAR(150) NOT NULL,
  `instance_id` VARCHAR(100) NOT NULL DEFAULT 'JARVES-ORIGIN-01',
  `status` ENUM('connected', 'unpaired', 'standby') NOT NULL DEFAULT 'standby',
  `gateway_mode` VARCHAR(50) NOT NULL DEFAULT 'evolution_api',
  `api_endpoint` VARCHAR(255) DEFAULT NULL,
  `api_key` VARCHAR(255) DEFAULT NULL,
  `auto_sign` TINYINT(1) NOT NULL DEFAULT 1,
  `registered_at` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. TABELA DE REGRAS DE AUTOMAÇÃO DE WHATSAPP
-- Disparo automático de relatórios, resumos diários e alertas para contatos
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `whatsapp_automacoes`;
CREATE TABLE `whatsapp_automacoes` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `contact_name` VARCHAR(150) NOT NULL,
  `contact_phone` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `template_message` TEXT NOT NULL,
  `trigger_type` ENUM('daily_summary', 'meeting_reminder', 'finance_alert', 'system_status', 'custom') NOT NULL DEFAULT 'daily_summary',
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `last_dispatched` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wa_user` (`user_id`),
  KEY `idx_wa_enabled` (`enabled`),
  CONSTRAINT `fk_whatsapp_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. TABELA DE LOGS DE MENSAGENS DO WHATSAPP ENVIADAS / RECEBIDAS
-- Histórico e rastreabilidade de conversas do assistente
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `whatsapp_mensagens_log`;
CREATE TABLE `whatsapp_mensagens_log` (
  `id` VARCHAR(64) NOT NULL,
  `rule_id` VARCHAR(64) DEFAULT NULL,
  `contact_phone` VARCHAR(50) NOT NULL,
  `contact_name` VARCHAR(150) DEFAULT NULL,
  `message` TEXT NOT NULL,
  `direction` ENUM('incoming', 'outgoing') NOT NULL DEFAULT 'outgoing',
  `status` ENUM('sent', 'received', 'failed', 'replied') NOT NULL DEFAULT 'sent',
  `dispatched_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wa_msg_phone` (`contact_phone`),
  KEY `idx_wa_msg_dispatched` (`dispatched_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. TABELA DE DISPOSITIVOS INTELIGENTES (IOT & SMART HOME)
-- Lâmpadas, Ar condicionado, Portas, Smart TVs, Sensores e Câmeras
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `dispositivos_smart`;
CREATE TABLE `dispositivos_smart` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `room` VARCHAR(100) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `protocol` VARCHAR(50) NOT NULL,
  `is_on` TINYINT(1) NOT NULL DEFAULT 0,
  `power_watts` INT UNSIGNED NOT NULL DEFAULT 0,
  `brightness` INT UNSIGNED DEFAULT NULL,
  `color_hex` VARCHAR(20) DEFAULT NULL,
  `temperature` INT DEFAULT NULL,
  `target_mode` VARCHAR(50) DEFAULT NULL,
  `volume` INT UNSIGNED DEFAULT NULL,
  `battery_level` INT UNSIGNED DEFAULT NULL,
  `is_locked` TINYINT(1) DEFAULT NULL,
  `ip_address` VARCHAR(50) DEFAULT NULL,
  `signal_strength` INT NOT NULL DEFAULT -50,
  `last_action` VARCHAR(255) DEFAULT 'Aguardando comando',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_smart_room` (`room`),
  KEY `idx_smart_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. TABELA DE CENAS E ROTINAS INTELIGENTES
-- Modos Cinema, Trabalho, Sono, Segurança e Conforto
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `rotinas_cenas_smart`;
CREATE TABLE `rotinas_cenas_smart` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `icon_name` VARCHAR(50) NOT NULL,
  `voice_trigger_phrase` VARCHAR(255) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `devices_affected_count` INT UNSIGNED NOT NULL DEFAULT 1,
  `is_active` TINYINT(1) NOT NULL DEFAULT 0,
  `color_scheme` VARCHAR(50) NOT NULL DEFAULT 'cyan',
  `last_executed` VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 11. TABELA DE SMART TVS E DISPOSITIVOS DE ESPELHAMENTO
-- Transmissão de tela 4K / FHD, Miracast, AirPlay, Chromecast
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `dispositivos_espelhamento_tv`;
CREATE TABLE `dispositivos_espelhamento_tv` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `brand` VARCHAR(50) NOT NULL,
  `model` VARCHAR(100) DEFAULT NULL,
  `protocol` VARCHAR(50) NOT NULL,
  `ip_address` VARCHAR(50) NOT NULL,
  `mac_address` VARCHAR(50) DEFAULT NULL,
  `resolution` VARCHAR(50) NOT NULL DEFAULT '1080p FHD',
  `fps` INT UNSIGNED NOT NULL DEFAULT 60,
  `signal_dbm` INT NOT NULL DEFAULT -40,
  `latency_ms` INT UNSIGNED NOT NULL DEFAULT 12,
  `status` ENUM('disconnected', 'connecting', 'connected') NOT NULL DEFAULT 'disconnected',
  `bitrate_mbps` DECIMAL(5,2) NOT NULL DEFAULT 28.50,
  `audio_streaming` TINYINT(1) NOT NULL DEFAULT 1,
  `remote_navigation_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `last_connected` VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 12. TABELA DE MENSAGENS DO CHAT JARVES & HISTÓRICO DE VOZ
-- Textos, respostas de síntese vocal, chamadas de funções executadas
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `mensagens_chat_jarves`;
CREATE TABLE `mensagens_chat_jarves` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `sender` ENUM('user', 'jarves', 'system') NOT NULL,
  `text` TEXT NOT NULL,
  `speech_text` TEXT DEFAULT NULL,
  `function_call_json` JSON DEFAULT NULL,
  `image_url` TEXT DEFAULT NULL,
  `audio_url` TEXT DEFAULT NULL,
  `timestamp` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chat_user` (`user_id`),
  KEY `idx_chat_created` (`created_at`),
  CONSTRAINT `fk_chat_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 13. TABELA DE LOGS DE AUDITORIA E COMANDOS DO SISTEMA
-- Comandos no PC, volume, print, hardware e rede
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `logs_sistema_auditoria`;
CREATE TABLE `logs_sistema_auditoria` (
  `id` VARCHAR(64) NOT NULL,
  `timestamp` VARCHAR(100) NOT NULL,
  `action` VARCHAR(255) NOT NULL,
  `device` VARCHAR(100) NOT NULL,
  `target` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('Concluído', 'Falha', 'Em Execução') NOT NULL DEFAULT 'Concluído',
  `actor` VARCHAR(150) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_logs_actor` (`actor`),
  KEY `idx_logs_device` (`device`),
  KEY `idx_logs_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 14. TABELA DE PONTUAÇÕES DO ARCADE & RECORDES
-- Cavaleiro Negro Pinball, Xadrez, Space Invaders, Pac-Man, F1 Ferrari, Simulador de Voo
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `arcade_pontuacoes`;
CREATE TABLE `arcade_pontuacoes` (
  `id` VARCHAR(64) NOT NULL,
  `game_key` VARCHAR(50) NOT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `player_name` VARCHAR(150) NOT NULL,
  `score` BIGINT NOT NULL DEFAULT 0,
  `level_reached` INT UNSIGNED NOT NULL DEFAULT 1,
  `extra_data_json` JSON DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_arcade_game` (`game_key`),
  KEY `idx_arcade_score` (`score` DESC),
  CONSTRAINT `fk_arcade_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 15. TABELA DE SALAS E PARTIDAS DO XADREZ CLÁSSICO E MEDIEVAL
-- Suporte a modo online P2P contra outro usuário ou contra IA Jarves
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `xadrez_salas_partidas`;
CREATE TABLE `xadrez_salas_partidas` (
  `id` VARCHAR(64) NOT NULL,
  `white_player_id` VARCHAR(64) DEFAULT NULL,
  `white_player_name` VARCHAR(150) NOT NULL DEFAULT 'Jogador Branco',
  `black_player_id` VARCHAR(64) DEFAULT NULL,
  `black_player_name` VARCHAR(150) NOT NULL DEFAULT 'Jarves IA',
  `current_turn` ENUM('white', 'black') NOT NULL DEFAULT 'white',
  `status` ENUM('waiting', 'active', 'check', 'checkmate', 'draw', 'resigned') NOT NULL DEFAULT 'active',
  `fen_state` VARCHAR(255) NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  `winner` VARCHAR(50) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_xadrez_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 16. TABELA DE JOGADAS E MOVIMENTOS DO XADREZ
-- Histórico e notação SAN de cada lance
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `xadrez_movimentos`;
CREATE TABLE `xadrez_movimentos` (
  `id` VARCHAR(64) NOT NULL,
  `room_id` VARCHAR(64) NOT NULL,
  `move_number` INT UNSIGNED NOT NULL,
  `player_color` ENUM('white', 'black') NOT NULL,
  `from_square` VARCHAR(4) NOT NULL,
  `to_square` VARCHAR(4) NOT NULL,
  `san` VARCHAR(20) DEFAULT NULL,
  `fen_after` VARCHAR(255) DEFAULT NULL,
  `played_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mov_room` (`room_id`),
  CONSTRAINT `fk_movimentos_room` FOREIGN KEY (`room_id`) REFERENCES `xadrez_salas_partidas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 17. TABELA DE MÍDIA, PLAYLISTS MP3 E FAVORITOS DO YOUTUBE
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `midia_favoritos_playlists`;
CREATE TABLE `midia_favoritos_playlists` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `type` ENUM('mp3', 'youtube', 'weblink') NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `url_or_id` VARCHAR(500) NOT NULL,
  `artist_or_channel` VARCHAR(150) DEFAULT NULL,
  `category` VARCHAR(100) NOT NULL DEFAULT 'Geral',
  `thumbnail_url` VARCHAR(500) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_midia_user` (`user_id`),
  KEY `idx_midia_type` (`type`),
  CONSTRAINT `fk_midia_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 18. TABELA DO TUTOR DE INGLÊS & TRADUTOR
-- Histórico de conversas em inglês, pronúncia e correções
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `tutor_ingles_historico`;
CREATE TABLE `tutor_ingles_historico` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `sender` ENUM('user', 'tutor') NOT NULL,
  `english_text` TEXT NOT NULL,
  `translation_pt` TEXT DEFAULT NULL,
  `feedback_json` JSON DEFAULT NULL,
  `mode` VARCHAR(50) NOT NULL DEFAULT 'conversation',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tutor_user` (`user_id`),
  CONSTRAINT `fk_tutor_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 19. TABELA DE CONFIGURAÇÃO DE HARDWARE, VOZ E TELEMETRIA
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `configuracoes_hardware_voz`;
CREATE TABLE `configuracoes_hardware_voz` (
  `id` VARCHAR(64) NOT NULL DEFAULT 'current',
  `camera` TINYINT(1) NOT NULL DEFAULT 0,
  `microphone` TINYINT(1) NOT NULL DEFAULT 1,
  `bluetooth` TINYINT(1) NOT NULL DEFAULT 1,
  `wifi` TINYINT(1) NOT NULL DEFAULT 1,
  `voice_type` ENUM('masculino', 'feminino') NOT NULL DEFAULT 'masculino',
  `pitch` DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  `rate` DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  `continuous_listening` TINYINT(1) NOT NULL DEFAULT 0,
  `auto_speak` TINYINT(1) NOT NULL DEFAULT 1,
  `selected_voice_uri` VARCHAR(255) DEFAULT NULL,
  `system_volume` INT UNSIGNED NOT NULL DEFAULT 85,
  `system_temperature` INT NOT NULL DEFAULT 24,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 20. TABELA DE SNAPSHOTS DO COFRE CRIPTOGRAFADO (BACKUP COMPLETO DO SISTEMA)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `cofre_snapshots_backup`;
CREATE TABLE `cofre_snapshots_backup` (
  `id` VARCHAR(64) NOT NULL,
  `version` INT UNSIGNED NOT NULL DEFAULT 1,
  `checksum` VARCHAR(100) NOT NULL,
  `data_json` LONGTEXT NOT NULL,
  `created_by` VARCHAR(150) NOT NULL DEFAULT 'Romildo',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_snap_checksum` (`checksum`),
  KEY `idx_snap_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==============================================================================
-- CARGA INICIAL DE DADOS (SEEDS DO SISTEMA JARVES)
-- Inserção de dados padrão garantindo pleno funcionamento imediato
-- ==============================================================================

-- Inserir Usuários Iniciais (incluindo o Master Admin Romildo)
INSERT INTO `usuarios` (`id`, `name`, `username`, `password`, `email`, `phone`, `role`, `status`, `last_access`, `last_ip`, `action_logs_count`) VALUES
('usr-romildo-master', 'Romildo', 'Romildo', 'Romildo2009@', 'geoimoveissantos@gmail.com', '13 996361313', 'Admin', 'Ativo', 'Hoje, 09:20', '192.168.1.100 (Local)', 42),
('usr-002', 'Eng. João Silva', 'joaosilva', 'User2026@', 'joao.silva@jarves.tech', '+55 11 98888-7777', 'User', 'Ativo', 'Hoje, 08:15', '192.168.1.105', 12),
('usr-003', 'Dra. Clara Andrade', 'clara', 'User2026@', 'clara.andrade@jarves.tech', '+55 11 97777-6666', 'User', 'Ativo', 'Ontem, 18:40', '189.44.12.33', 28),
('usr-004', 'Suporte Operador', 'suporte', 'User2026@', 'suporte@jarves.tech', '+55 11 96666-5555', 'User', 'Suspenso', '12/09, 14:10', '177.30.90.11', 5)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Inserir Transações Financeiras Iniciais
INSERT INTO `transacoes_financeiras` (`id`, `user_id`, `description`, `amount`, `type`, `category`, `date`, `source`) VALUES
('f1', 'usr-romildo-master', 'Honorários de Consultoria Tecnológica', 14500.00, 'income', 'Consultoria', '15/09/2026', 'manual'),
('f2', 'usr-romildo-master', 'Servidores Cloud & Licenças IA', 1850.00, 'expense', 'Tecnologia', '14/09/2026', 'manual'),
('f3', 'usr-romildo-master', 'Projetos de Arquitetura Imobiliária', 8900.00, 'income', 'Imóveis', '12/09/2026', 'manual'),
('f4', 'usr-romildo-master', 'Manutenção Veicular Especializada', 680.00, 'expense', 'Transporte', '10/09/2026', 'manual')
ON DUPLICATE KEY UPDATE `description`=VALUES(`description`);

-- Inserir Eventos da Agenda
INSERT INTO `eventos_agenda` (`id`, `user_id`, `title`, `datetime`, `category`, `completed`) VALUES
('e1', 'usr-romildo-master', 'Alinhamento Estratégico com Diretoria', 'Amanhã às 10:00', 'Reunião', 0),
('e2', 'usr-romildo-master', 'Auditoria de Segurança nos Servidores', 'Quinta-feira às 15:30', 'Tarefa', 0),
('e3', 'usr-romildo-master', 'Consulta Odontológica Periódica', 'Sexta-feira às 14:00', 'Pessoal', 0),
('e4', 'usr-romildo-master', 'Acompanhamento de Obras Santos', 'Sábado às 09:00', 'Lembrete', 0)
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);

-- Inserir Hábitos
INSERT INTO `habitos` (`id`, `user_id`, `title`, `streak`, `target`, `completed_today`, `category`) VALUES
('h1', 'usr-romildo-master', 'Treino Físico & Alongamento', 14, 1, 1, 'Saúde'),
('h2', 'usr-romildo-master', 'Leitura Técnica (30 min)', 8, 1, 1, 'Estudo'),
('h3', 'usr-romildo-master', 'Hidratação (3 Litros de Água)', 21, 1, 0, 'Saúde'),
('h4', 'usr-romildo-master', 'Revisão Financeira Noturna', 30, 1, 0, 'Finanças')
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);

-- Inserir Projetos
INSERT INTO `projetos` (`id`, `user_id`, `name`, `progress`, `deadline`, `status`) VALUES
('p1', 'usr-romildo-master', 'Implantação JARVES Enterprise Santos', 85, '30/10/2026', 'Em Andamento'),
('p2', 'usr-romildo-master', 'Automação Predial IoT & Termostatos', 60, '15/11/2026', 'Em Andamento'),
('p3', 'usr-romildo-master', 'Módulo Tradutor Inglês com IA Neural', 100, '10/09/2026', 'Concluído')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Inserir Configuração Inicial do WhatsApp de Origem
INSERT INTO `whatsapp_origem_config` (`id`, `phone_number`, `sender_name`, `instance_id`, `status`, `gateway_mode`, `auto_sign`) VALUES
('origin-001', '13 996361313', 'Romildo (Master)', 'JARVES-ORIGIN-01', 'connected', 'evolution_api', 1)
ON DUPLICATE KEY UPDATE `sender_name`=VALUES(`sender_name`);

-- Inserir Automações do WhatsApp
INSERT INTO `whatsapp_automacoes` (`id`, `user_id`, `contact_name`, `contact_phone`, `title`, `template_message`, `trigger_type`, `enabled`) VALUES
('wa1', 'usr-romildo-master', 'Romildo (Master)', '13 996361313', 'Relatório Diário de Operações JARVES', 'Olá Sr. Romildo, seu resumo diário de compromissos e métricas do sistema está concluído.', 'daily_summary', 1),
('wa2', 'usr-romildo-master', 'Diretoria Executiva', '11 977776666', 'Alerta de Metas Financeiras', 'Prezados, o balanço de fechamento semanal atingiu as metas programadas.', 'finance_alert', 1),
('wa3', 'usr-romildo-master', 'Engenharia de Software', '11 988887777', 'Status de Servidores e Telemetria', 'Aviso: Todos os nós de servidores estão operando com 99.98% de estabilidade.', 'system_status', 1)
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);

-- Inserir Dispositivos Smart IoT
INSERT INTO `dispositivos_smart` (`id`, `name`, `room`, `category`, `protocol`, `is_on`, `power_watts`, `brightness`, `color_hex`, `temperature`, `target_mode`, `signal_strength`) VALUES
('dev-1', 'Iluminação Central do Escritório', 'Escritório', 'light', 'zigbee', 1, 45, 85, '#00F0FF', NULL, NULL, -45),
('dev-2', 'Climatizador & Termostato Inteligente', 'Escritório', 'climate', 'matter', 1, 1200, NULL, NULL, 22, 'cool', -40),
('dev-3', 'Smart TV OLED 65" 4K', 'Sala de Reuniões', 'entertainment', 'wifi', 0, 150, NULL, NULL, NULL, NULL, -52),
('dev-4', 'Fechadura Biométrica Porta Principal', 'Hall de Entrada', 'security', 'matter', 1, 12, NULL, NULL, NULL, NULL, -38)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Inserir Dispositivos de Espelhamento TV
INSERT INTO `dispositivos_espelhamento_tv` (`id`, `name`, `brand`, `model`, `protocol`, `ip_address`, `mac_address`, `resolution`, `fps`, `signal_dbm`, `latency_ms`, `status`) VALUES
('tv-1', 'Samsung Neo QLED 4K 65"', 'samsung', 'QN90C', 'chromecast', '192.168.1.150', 'A4:C3:F0:22:9A:10', '4K UHD (3840x2160)', 60, -38, 11, 'connected'),
('tv-2', 'LG OLED C3 55"', 'lg', 'OLED55C3', 'airplay', '192.168.1.155', '3C:CD:36:A1:B8:20', '4K UHD (3840x2160)', 60, -42, 14, 'disconnected'),
('tv-3', 'Sony Bravia XR Master', 'sony', 'XR-65A80L', 'miracast', '192.168.1.160', '70:26:05:EE:99:34', '1080p FHD', 60, -45, 18, 'disconnected')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Inserir Recordes Iniciais do Arcade
INSERT INTO `arcade_pontuacoes` (`id`, `game_key`, `player_name`, `score`, `level_reached`) VALUES
('sc-1', 'cavaleiro_negro', 'Romildo (Master)', 1854200, 12),
('sc-2', 'cavaleiro_negro', 'Eng. João Silva', 1245000, 9),
('sc-3', 'xadrez', 'Romildo (Master)', 2400, 1),
('sc-4', 'xadrez', 'Jarves IA (Mestre)', 2350, 1),
('sc-5', 'f1_ferrari', 'Romildo (Master)', 98500, 8),
('sc-6', 'space_invaders', 'Romildo (Master)', 76400, 7),
('sc-7', 'pacman', 'Romildo (Master)', 142000, 14)
ON DUPLICATE KEY UPDATE `score`=VALUES(`score`);

-- Inserir Configuração de Hardware e Voz
INSERT INTO `configuracoes_hardware_voz` (`id`, `camera`, `microphone`, `bluetooth`, `wifi`, `voice_type`, `pitch`, `rate`, `system_volume`, `system_temperature`) VALUES
('current', 0, 1, 1, 1, 'masculino', 1.00, 1.00, 85, 24)
ON DUPLICATE KEY UPDATE `voice_type`=VALUES(`voice_type`);


-- ------------------------------------------------------------------------------
-- 21. TABELA DE MÚSICAS MP3 INDIVIDUAIS DOS USUÁRIOS
-- Armazena arquivos MP3, URLs de áudio e metadados com isolamento estrito por usuário
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `usuario_musicas_mp3`;
CREATE TABLE `usuario_musicas_mp3` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `artist` VARCHAR(255) NOT NULL DEFAULT 'Artista Desconhecido',
  `file_url` MEDIUMTEXT NOT NULL,
  `duration_seconds` INT UNSIGNED NOT NULL DEFAULT 0,
  `size_bytes` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `genre` VARCHAR(100) NOT NULL DEFAULT 'Geral',
  `source` ENUM('manual_upload', 'json_import', 'preset', 'url_stream') NOT NULL DEFAULT 'manual_upload',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_musicas_user` (`user_id`),
  KEY `idx_musicas_title` (`title`),
  KEY `idx_musicas_artist` (`artist`),
  CONSTRAINT `fk_musicas_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 22. TABELA DE LINKS DE VÍDEOS INDIVIDUAIS (YOUTUBE / DAILYMOTION / DIRETO)
-- Armazena links e identificadores de vídeos por usuário para reprodução automática via IA
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `usuario_videos_links`;
CREATE TABLE `usuario_videos_links` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `artist` VARCHAR(255) NOT NULL DEFAULT 'Canal / Autor',
  `video_url` TEXT NOT NULL,
  `video_id` VARCHAR(128) NOT NULL,
  `platform` ENUM('youtube', 'dailymotion', 'direct') NOT NULL DEFAULT 'youtube',
  `category` VARCHAR(100) NOT NULL DEFAULT 'Geral',
  `description` TEXT DEFAULT NULL,
  `source` ENUM('manual_entry', 'json_import', 'preset') NOT NULL DEFAULT 'manual_entry',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_videos_user` (`user_id`),
  KEY `idx_videos_platform` (`platform`),
  KEY `idx_videos_title` (`title`),
  CONSTRAINT `fk_videos_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 23. TABELA DE LOGS DE IMPORTAÇÃO EM MASSA (JSON)
-- Registra importações de bibliotecas de áudio e vídeo realizadas pelos usuários
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `usuario_midia_import_logs`;
CREATE TABLE `usuario_midia_import_logs` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `items_imported` INT UNSIGNED NOT NULL DEFAULT 0,
  `import_type` VARCHAR(50) NOT NULL DEFAULT 'json_bulk',
  `summary` JSON DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_import_user` (`user_id`),
  CONSTRAINT `fk_import_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- CARGA INICIAL DE MÚSICAS MP3 E VÍDEOS PARA O USUÁRIO MESTRE (ROMILDO)
-- ------------------------------------------------------------------------------
INSERT INTO `usuario_musicas_mp3` (`id`, `user_id`, `title`, `artist`, `file_url`, `duration_seconds`, `size_bytes`, `genre`, `source`) VALUES
('mp3-romildo-1', 'usr-romildo-master', 'Iron Man Holo-Audio Theme', 'Tony Stark Labs', 'https://actions.google.com/sounds/v1/science_fiction/scifi_engine_run_steady.ogg', 180, 2800000, 'Sci-Fi', 'preset'),
('mp3-romildo-2', 'usr-romildo-master', 'Synthwave Flight Pulse', 'JARVES Cybernetics', 'https://actions.google.com/sounds/v1/science_fiction/teleport.ogg', 215, 3400000, 'Synthwave', 'preset')
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);

INSERT INTO `usuario_videos_links` (`id`, `user_id`, `title`, `artist`, `video_url`, `video_id`, `platform`, `category`, `description`, `source`) VALUES
('vid-romildo-1', 'usr-romildo-master', 'Back in Black (Iron Man Theme)', 'AC/DC', 'https://www.youtube.com/watch?v=pAgnJDJN4VA', 'pAgnJDJN4VA', 'youtube', 'Rock Clássico', 'Tema clássico de Tony Stark no JARVES', 'preset'),
('vid-romildo-2', 'usr-romildo-master', 'Águas de Março', 'Elis Regina & Tom Jobim', 'https://www.youtube.com/watch?v=rkP8Z9v2f9Y', 'rkP8Z9v2f9Y', 'youtube', 'MPB Clássico', 'Dueto histórico e inesquecível da MPB', 'preset'),
('vid-romildo-3', 'usr-romildo-master', 'Documentário Tecnologia Aeroespacial', 'Dailymotion Science', 'https://www.dailymotion.com/video/x8n6f1q', 'x8n6f1q', 'dailymotion', 'Ciência & Engenharia', 'Streaming Dailymotion em alta definição', 'preset')
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);

SET FOREIGN_KEY_CHECKS = 1;
