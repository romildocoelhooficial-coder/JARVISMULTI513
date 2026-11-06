<?php
/**
 * ==============================================================================
 * JARVES INTELLIGENT SYSTEM - API DE SINCRONIZAÇÃO MYSQL (sync_jarves.php)
 * Banco de Dados: emribeir_jarves
 * Permite sincronizar os dados locais com o MySQL ou consultar todo o estado
 * ==============================================================================
 */

require_once __DIR__ . '/conexao.php';

try {
    $pdo = getPDOConnection();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    // GET: Recupera todo o estado armazenado no banco emribeir_jarves
    if ($method === 'GET') {
        $usuarios = dbSelect("SELECT id, name, username, email, phone, role, status, last_access, last_ip, action_logs_count, custom_settings FROM usuarios ORDER BY role ASC, name ASC");
        $transacoes = dbSelect("SELECT * FROM transacoes_financeiras ORDER BY id DESC");
        $eventos = dbSelect("SELECT * FROM eventos_agenda ORDER BY id DESC");
        $habitos = dbSelect("SELECT * FROM habitos ORDER BY id ASC");
        $projetos = dbSelect("SELECT * FROM projetos ORDER BY id ASC");
        $automacoes = dbSelect("SELECT * FROM whatsapp_automacoes ORDER BY id ASC");
        $dispositivos = dbSelect("SELECT * FROM dispositivos_smart ORDER BY room ASC, name ASC");
        $tvDevices = dbSelect("SELECT * FROM dispositivos_espelhamento_tv ORDER BY id ASC");
        $arcade = dbSelect("SELECT * FROM arcade_pontuacoes ORDER BY score DESC");
        $waOrigin = dbSelect("SELECT * FROM whatsapp_origem_config LIMIT 1");
        $hardware = dbSelect("SELECT * FROM configuracoes_hardware_voz WHERE id = 'current' LIMIT 1");

        jsonResponse([
            'success'      => true,
            'database'     => JARVES_DB_NAME,
            'timestamp'    => date('Y-m-d H:i:s'),
            'data'         => [
                'users'               => $usuarios,
                'transactions'        => $transacoes,
                'calendarEvents'      => $eventos,
                'habits'              => $habitos,
                'projects'            => $projetos,
                'whatsAppAutomations' => $automacoes,
                'smartDevices'        => $dispositivos,
                'tvMirrorDevices'     => $tvDevices,
                'arcadeScores'        => $arcade,
                'whatsAppOrigin'      => $waOrigin ? $waOrigin[0] : null,
                'hardwareVoice'       => $hardware ? $hardware[0] : null,
            ]
        ]);
    }

    // POST: Recebe payload JSON do JARVES e salva/atualiza no MySQL
    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

        if (!$data || !is_array($data)) {
            jsonError("Payload JSON inválido.", 400);
        }

        $pdo->beginTransaction();

        // 1. Sincronizar Usuários
        if (!empty($data['users']) && is_array($data['users'])) {
            $stmtUser = $pdo->prepare("
                INSERT INTO usuarios (id, name, username, password, email, phone, role, status, last_access, last_ip, action_logs_count)
                VALUES (:id, :name, :username, :password, :email, :phone, :role, :status, :last_access, :last_ip, :action_logs_count)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    username = VALUES(username),
                    password = IF(VALUES(password) != '', VALUES(password), password),
                    phone = VALUES(phone),
                    role = VALUES(role),
                    status = VALUES(status),
                    last_access = VALUES(last_access)
            ");
            foreach ($data['users'] as $u) {
                $stmtUser->execute([
                    ':id'               => $u['id'] ?? ('usr-' . uniqid()),
                    ':name'             => $u['name'] ?? 'Usuário',
                    ':username'         => $u['username'] ?? ($u['name'] ?? 'user'),
                    ':password'         => !empty($u['password']) ? $u['password'] : 'User2026@',
                    ':email'            => $u['email'] ?? ($u['id'] . '@jarves.tech'),
                    ':phone'            => $u['phone'] ?? '',
                    ':role'             => in_array($u['role'] ?? '', ['Admin', 'User']) ? $u['role'] : 'User',
                    ':status'           => ($u['status'] ?? '') === 'Suspenso' ? 'Suspenso' : 'Ativo',
                    ':last_access'      => $u['lastAccess'] ?? 'Hoje, ' . date('H:i'),
                    ':last_ip'          => $u['lastIp'] ?? ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'),
                    ':action_logs_count'=> intval($u['actionLogsCount'] ?? 0),
                ]);
            }
        }

        // 2. Sincronizar Transações Financeiras
        if (!empty($data['transactions']) && is_array($data['transactions'])) {
            $stmtTrans = $pdo->prepare("
                INSERT INTO transacoes_financeiras (id, user_id, description, amount, type, category, date, source)
                VALUES (:id, :user_id, :description, :amount, :type, :category, :date, :source)
                ON DUPLICATE KEY UPDATE
                    description = VALUES(description),
                    amount = VALUES(amount),
                    type = VALUES(type),
                    category = VALUES(category),
                    date = VALUES(date)
            ");
            foreach ($data['transactions'] as $t) {
                $stmtTrans->execute([
                    ':id'          => $t['id'] ?? ('f-' . uniqid()),
                    ':user_id'     => $t['userId'] ?? 'usr-romildo-master',
                    ':description' => $t['description'] ?? 'Lançamento',
                    ':amount'      => floatval($t['amount'] ?? 0),
                    ':type'        => ($t['type'] ?? '') === 'income' ? 'income' : 'expense',
                    ':category'    => $t['category'] ?? 'Geral',
                    ':date'        => $t['date'] ?? date('d/m/Y'),
                    ':source'      => $t['source'] ?? 'manual',
                ]);
            }
        }

        // 3. Salvar Snapshot no Cofre
        $stmtSnap = $pdo->prepare("
            INSERT INTO cofre_snapshots_backup (id, version, checksum, data_json, created_by)
            VALUES (:id, :version, :checksum, :data_json, :created_by)
        ");
        $stmtSnap->execute([
            ':id'         => 'snap-' . time(),
            ':version'    => intval($data['version'] ?? 1),
            ':checksum'   => $data['checksum'] ?? ('JV-' . substr(md5($raw), 0, 10)),
            ':data_json'  => $raw,
            ':created_by' => 'Romildo (Master)',
        ]);

        $pdo->commit();

        jsonResponse([
            'success'   => true,
            'message'   => 'Dados persistidos com sucesso no MySQL emribeir_jarves!',
            'database'  => JARVES_DB_NAME,
            'timestamp' => date('Y-m-d H:i:s'),
        ]);
    }

    jsonError("Método não suportado. Use GET para consultar ou POST para sincronizar.", 405);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonError("Erro durante a operação no banco emribeir_jarves: " . $e->getMessage(), 500);
}
?>
