<?php
/**
 * ==============================================================================
 * JARVES INTELLIGENT SYSTEM - ARQUIVO PRINCIPAL DO SITE (index.php)
 * Banco de Dados: emribeir_jarves
 * Usuário MySQL: emribeir_romildo
 * Compatibilidade: PHP 7.4 / PHP 8.0 / PHP 8.1 / PHP 8.2+
 * Servidores: Apache, cPanel, LiteSpeed, Nginx, Hostinger, Locaweb, etc.
 * ==============================================================================
 */

// 1. Incluir arquivo de conexão com o MySQL
$conexaoFile = __DIR__ . '/conexao.php';
if (!file_exists($conexaoFile)) {
    $conexaoFile = __DIR__ . '/public/api/conexao.php';
}

$dbConnected = false;
$dbError = null;
$dbTables = [];

if (file_exists($conexaoFile)) {
    require_once $conexaoFile;
    try {
        $pdo = getPDOConnection();
        $dbConnected = true;
        $dbTables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    } catch (Exception $e) {
        $dbConnected = false;
        $dbError = $e->getMessage();
    }
}

// 2. Se a requisição for uma chamada de API direta via index.php?api=...
if (isset($_GET['api'])) {
    header("Content-Type: application/json; charset=UTF-8");
    $endpoint = trim($_GET['api']);

    if ($endpoint === 'status' || $endpoint === 'test' || $endpoint === 'health') {
        echo json_encode([
            'success'      => $dbConnected,
            'system'       => 'JARVES Core v4.2',
            'database'     => defined('JARVES_DB_NAME') ? JARVES_DB_NAME : 'emribeir_jarves',
            'user'         => defined('JARVES_DB_USER') ? JARVES_DB_USER : 'emribeir_romildo',
            'connected'    => $dbConnected,
            'error'        => $dbError,
            'tables_count' => count($dbTables),
            'tables'       => $dbTables,
            'timestamp'    => date('Y-m-d H:i:s'),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($endpoint === 'sync') {
        $syncFile = __DIR__ . '/public/api/sync_jarves.php';
        if (file_exists($syncFile)) {
            require_once $syncFile;
            exit;
        }
    }

    if (strpos($endpoint, 'tts') !== false || strpos($endpoint, 'jarvis') !== false) {
        $_GET['action'] = $endpoint;
        $apiFile = __DIR__ . '/api.php';
        if (file_exists($apiFile)) {
            require_once $apiFile;
            exit;
        }
    }
}

// 3. Localizar assets compilados do React (Vite)
$assetsDir = __DIR__ . '/assets';
if (!is_dir($assetsDir)) {
    $assetsDir = __DIR__ . '/dist/assets';
}

$jsBundle = null;
$cssBundle = null;

if (is_dir($assetsDir)) {
    $files = scandir($assetsDir);
    foreach ($files as $file) {
        if (substr($file, -3) === '.js' && strpos($file, 'index') !== false && !$jsBundle) {
            $jsBundle = 'assets/' . $file;
        }
        if (substr($file, -4) === '.css' && strpos($file, 'index') !== false && !$cssBundle) {
            $cssBundle = 'assets/' . $file;
        }
    }
}

// Fallbacks de assets caso padrão dist
if (!$jsBundle) {
    if (file_exists(__DIR__ . '/dist/assets/index-BMwb3yS4.js')) {
        $jsBundle = 'dist/assets/index-BMwb3yS4.js';
    } else {
        $jsBundle = 'assets/index-BMwb3yS4.js';
    }
}
if (!$cssBundle) {
    if (file_exists(__DIR__ . '/dist/assets/index-CSxgcZhv.css')) {
        $cssBundle = 'dist/assets/index-CSxgcZhv.css';
    } else {
        $cssBundle = 'assets/index-CSxgcZhv.css';
    }
}

// Detectar base URL relativa para funcionar em qualquer subpasta (ex: /jarves ou /)
$baseUrl = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
if ($baseUrl === '') $baseUrl = '';
?>
<!doctype html>
<html lang="pt-BR" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="#0B0E14" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="format-detection" content="telephone=no" />
    
    <title>JARVES - Assistente Virtual de Alta Performance</title>
    <meta name="description" content="Assistente virtual futurista inspirado em J.A.R.V.I.S., conectado ao banco MySQL emribeir_jarves, com controle de hardware, voz neural, jogos clássicos de arcade e automação completa." />
    <meta property="og:title" content="JARVES - Assistente Virtual de Alta Performance" />
    <meta property="og:description" content="Assistente virtual com banco MySQL emribeir_jarves, xadrez online, finanças, HP12C e automações." />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Rajdhani:wght@500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <!-- Configuração Dinâmica injetada pelo PHP do MySQL emribeir_jarves -->
    <script>
      window.__JARVES_PHP_ENV__ = {
        connected: <?= $dbConnected ? 'true' : 'false' ?>,
        database: '<?= defined('JARVES_DB_NAME') ? addslashes(JARVES_DB_NAME) : 'emribeir_jarves' ?>',
        user: '<?= defined('JARVES_DB_USER') ? addslashes(JARVES_DB_USER) : 'emribeir_romildo' ?>',
        tablesCount: <?= count($dbTables) ?>,
        error: <?= $dbError ? json_encode($dbError) : 'null' ?>,
        baseUrl: '<?= $baseUrl ?>',
        apiEndpoint: '<?= $baseUrl ?>/api.php'
      };

      // Global resilience guard for JSON.parse against 'undefined' / 'null' strings
      (function() {
        const _origParse = JSON.parse;
        JSON.parse = function(text, reviver) {
          if (text === undefined || text === null || text === 'undefined' || text === 'null' || text === '') {
            return null;
          }
          try {
            return _origParse.call(JSON, text, reviver);
          } catch (e) {
            if (typeof text === 'string') {
              const trimmed = text.trim();
              if (trimmed === 'undefined' || trimmed === 'null' || trimmed === '') return null;
              if (trimmed === 'true') return true;
              if (trimmed === 'false') return false;
            }
            throw e;
          }
        };
      })();
    </script>

    <?php if ($cssBundle && file_exists(__DIR__ . '/' . $cssBundle)): ?>
      <link rel="stylesheet" crossorigin href="<?= $baseUrl ?>/<?= htmlspecialchars($cssBundle) ?>">
    <?php elseif (file_exists(__DIR__ . '/dist/assets/index-CSxgcZhv.css')): ?>
      <link rel="stylesheet" crossorigin href="<?= $baseUrl ?>/dist/assets/index-CSxgcZhv.css">
    <?php endif; ?>

    <?php if ($jsBundle && file_exists(__DIR__ . '/' . $jsBundle)): ?>
      <script type="module" crossorigin src="<?= $baseUrl ?>/<?= htmlspecialchars($jsBundle) ?>"></script>
    <?php elseif (file_exists(__DIR__ . '/dist/assets/index-BMwb3yS4.js')): ?>
      <script type="module" crossorigin src="<?= $baseUrl ?>/dist/assets/index-BMwb3yS4.js"></script>
    <?php else: ?>
      <!-- Modo de Desenvolvimento Vite (quando rodando com servidor node ativo) -->
      <script type="module" src="<?= $baseUrl ?>/src/main.tsx"></script>
    <?php endif; ?>
  </head>
  <body class="bg-[#0B0E14] text-slate-100 antialiased selection:bg-[#00F0FF]/30 selection:text-[#00F0FF] overflow-x-hidden">
    <div id="root">
      <!-- Loading Skeleton Inicial de Alto Impacto enquanto o React carrega -->
      <div id="jarves-bootstrap-loader" style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #0B0E14; font-family: 'Orbitron', monospace; color: #00F0FF; text-align: center; padding: 20px;">
        <div style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid rgba(0, 240, 255, 0.2); border-top-color: #00F0FF; animation: spin 1s linear infinite; margin-bottom: 24px;"></div>
        <h1 style="font-size: 24px; font-weight: 800; letter-spacing: 4px; margin-bottom: 8px;">J.A.R.V.E.S.</h1>
        <p style="font-size: 12px; color: #94A3B8; font-family: monospace; letter-spacing: 2px;">SISTEMA INTELIGENTE DE ALTA PERFORMANCE</p>
        <p style="font-size: 11px; color: #10B981; font-family: monospace; margin-top: 12px;">
          BANCO DE DADOS: <strong>emribeir_jarves</strong> <?= $dbConnected ? '● CONECTADO' : '○ OFFLINE' ?>
        </p>
        <style>
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </div>
    </div>
  </body>
</html>
