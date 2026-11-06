<?php
/**
 * ==============================================================================
 * JARVES INTELLIGENT SYSTEM - ARQUIVO DE CONEXÃO MYSQL (conexao.php)
 * Banco de Dados: emribeir_jarves
 * Compatibilidade: PHP 7.4 / PHP 8.0 / PHP 8.1 / PHP 8.2+
 * Driver: PDO MySQL com UTF-8 / UTF8MB4 e Prepared Statements
 * ==============================================================================
 */

// Configuração de Cabeçalhos para APIs e Integração com Frontend / Webhooks
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Resposta imediata para requisições de preflight OPTIONS
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ------------------------------------------------------------------------------
// PARÂMETROS DE CONEXÃO COM O BANCO DE DADOS
// Prioriza variáveis de ambiente (.env / cPanel / Apache / Nginx) ou fallback
// ------------------------------------------------------------------------------
define('JARVES_DB_HOST', getenv('DB_HOST') !== false ? getenv('DB_HOST') : 'localhost');
define('JARVES_DB_NAME', getenv('DB_NAME') !== false ? getenv('DB_NAME') : 'emribeir_jarves');
define('JARVES_DB_USER', getenv('DB_USER') !== false ? getenv('DB_USER') : 'emribeir_romildo');
define('JARVES_DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : 'Romildo2009@');
define('JARVES_DB_PORT', getenv('DB_PORT') !== false ? getenv('DB_PORT') : '3306');
define('JARVES_DB_CHARSET', 'utf8mb4');

/**
 * Retorna a instância única ou nova de conexão PDO com o MySQL
 * 
 * @return PDO
 * @throws PDOException
 */
function getPDOConnection() {
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    $dsn = sprintf(
        "mysql:host=%s;port=%s;dbname=%s;charset=%s",
        JARVES_DB_HOST,
        JARVES_DB_PORT,
        JARVES_DB_NAME,
        JARVES_DB_CHARSET
    );

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
    ];

    try {
        $pdo = new PDO($dsn, JARVES_DB_USER, JARVES_DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        error_log("[JARVES DB ERROR] Falha na conexão com emribeir_jarves: " . $e->getMessage());
        throw $e;
    }
}

/**
 * Helper para envio de resposta padronizada em JSON com código HTTP
 */
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Helper para envio de erro estruturado em JSON
 */
function jsonError($message, $statusCode = 400, $details = null) {
    http_response_code($statusCode);
    $payload = [
        'success'   => false,
        'error'     => $message,
        'database'  => JARVES_DB_NAME,
        'timestamp' => date('Y-m-d H:i:s'),
    ];
    if ($details !== null) {
        $payload['details'] = $details;
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Executa query SELECT e retorna array de linhas
 */
function dbSelect($sql, $params = []) {
    $pdo = getPDOConnection();
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

/**
 * Executa query INSERT e retorna o ID inserido
 */
function dbInsert($sql, $params = []) {
    $pdo = getPDOConnection();
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $pdo->lastInsertId();
}

/**
 * Executa query UPDATE/DELETE e retorna o número de linhas afetadas
 */
function dbExecute($sql, $params = []) {
    $pdo = getPDOConnection();
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->rowCount();
}

// ------------------------------------------------------------------------------
// TESTE DIRETO QUANDO EXECUTADO NO NAVEGADOR OU VIA CLI
// Se acessado diretamente (conexao.php?test=1), valida a conexão
// ------------------------------------------------------------------------------
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'conexao.php') {
    try {
        $pdo = getPDOConnection();
        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);

        jsonResponse([
            'success'      => true,
            'message'      => 'Conexão com o banco de dados emribeir_jarves estabelecida com sucesso!',
            'system'       => 'JARVES CORE v4.2',
            'database'     => JARVES_DB_NAME,
            'host'         => JARVES_DB_HOST,
            'port'         => JARVES_DB_PORT,
            'user'         => JARVES_DB_USER,
            'tables_count' => count($tables),
            'tables'       => $tables,
            'server_info'  => $pdo->getAttribute(PDO::ATTR_SERVER_VERSION),
            'charset'      => JARVES_DB_CHARSET,
            'timestamp'    => date('Y-m-d H:i:s'),
        ]);
    } catch (Exception $e) {
        jsonError('Falha ao conectar com o banco de dados emribeir_jarves.', 500, [
            'exception'   => $e->getMessage(),
            'target_db'   => JARVES_DB_NAME,
            'target_host' => JARVES_DB_HOST,
            'hint'        => 'Certifique-se de que o MySQL está rodando e que as credenciais em conexao.php estão corretas.',
        ]);
    }
}
?>
