<?php
/**
 * ==============================================================================
 * JARVES INTELLIGENT SYSTEM - BACKEND REST API EM PHP (api.php)
 * Banco de Dados: emribeir_jarves
 * Usuário: emribeir_romildo
 * Permite que o frontend React converse diretamente com o MySQL no cPanel/PHP
 * ==============================================================================
 */

require_once __DIR__ . '/conexao.php';

try {
    $pdo = getPDOConnection();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $action = $_GET['action'] ?? ($_POST['action'] ?? 'status');

    // Leitura do corpo da requisição JSON (para chamadas POST/PUT)
    $inputRaw = file_get_contents('php://input');
    $inputData = json_decode($inputRaw, true);
    if (!is_array($inputData)) {
        $inputData = $_POST;
    }

    switch ($action) {
        // ----------------------------------------------------------------------
        // Status e Saúde da Conexão
        // ----------------------------------------------------------------------
        case 'status':
        case 'test':
        case 'health':
            $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
            jsonResponse([
                'success'      => true,
                'status'       => 'online',
                'database'     => JARVES_DB_NAME,
                'user'         => JARVES_DB_USER,
                'host'         => JARVES_DB_HOST,
                'tablesCount'  => count($tables),
                'tables'       => $tables,
                'server_info'  => $pdo->getAttribute(PDO::ATTR_SERVER_VERSION),
                'timestamp'    => date('Y-m-d H:i:s'),
            ]);
            break;

        // ----------------------------------------------------------------------
        // Módulo Usuários (CRUD)
        // ----------------------------------------------------------------------
        case 'usuarios':
        case 'users':
            if ($method === 'GET') {
                $rows = dbSelect("SELECT id, name, username, email, phone, role, status, last_access, last_ip, action_logs_count, custom_settings FROM usuarios ORDER BY role ASC, name ASC");
                jsonResponse(['success' => true, 'count' => count($rows), 'users' => $rows]);
            }
            break;

        case 'usuario_salvar':
            $id = $inputData['id'] ?? ('usr-' . uniqid());
            $name = trim($inputData['name'] ?? '');
            $username = trim($inputData['username'] ?? $name);
            $email = trim($inputData['email'] ?? '');
            $phone = trim($inputData['phone'] ?? '');
            $role = in_array($inputData['role'] ?? '', ['Admin', 'User']) ? $inputData['role'] : 'User';
            $status = ($inputData['status'] ?? '') === 'Suspenso' ? 'Suspenso' : 'Ativo';
            $password = !empty($inputData['password']) ? trim($inputData['password']) : null;

            if (empty($name) || empty($email)) {
                jsonError("Nome e e-mail são obrigatórios.", 400);
            }

            if ($password) {
                $sql = "INSERT INTO usuarios (id, name, username, password, email, phone, role, status)
                        VALUES (:id, :name, :username, :password, :email, :phone, :role, :status)
                        ON DUPLICATE KEY UPDATE
                            name = VALUES(name), username = VALUES(username), password = VALUES(password),
                            email = VALUES(email), phone = VALUES(phone), role = VALUES(role), status = VALUES(status)";
                $params = [
                    ':id' => $id, ':name' => $name, ':username' => $username, ':password' => $password,
                    ':email' => $email, ':phone' => $phone, ':role' => $role, ':status' => $status
                ];
            } else {
                $sql = "INSERT INTO usuarios (id, name, username, password, email, phone, role, status)
                        VALUES (:id, :name, :username, 'User2026@', :email, :phone, :role, :status)
                        ON DUPLICATE KEY UPDATE
                            name = VALUES(name), username = VALUES(username),
                            email = VALUES(email), phone = VALUES(phone), role = VALUES(role), status = VALUES(status)";
                $params = [
                    ':id' => $id, ':name' => $name, ':username' => $username,
                    ':email' => $email, ':phone' => $phone, ':role' => $role, ':status' => $status
                ];
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            jsonResponse(['success' => true, 'message' => 'Usuário gravado com sucesso no MySQL emribeir_jarves!', 'id' => $id]);
            break;

        // ----------------------------------------------------------------------
        // Módulo Financeiro
        // ----------------------------------------------------------------------
        case 'transacoes':
        case 'finance':
            if ($method === 'GET') {
                $rows = dbSelect("SELECT * FROM transacoes_financeiras ORDER BY id DESC");
                jsonResponse(['success' => true, 'count' => count($rows), 'transactions' => $rows]);
            }
            break;

        case 'transacao_salvar':
            $id = $inputData['id'] ?? ('f-' . uniqid());
            $userId = $inputData['userId'] ?? 'usr-romildo-master';
            $desc = trim($inputData['description'] ?? 'Lançamento');
            $amount = floatval($inputData['amount'] ?? 0);
            $type = ($inputData['type'] ?? '') === 'income' ? 'income' : 'expense';
            $category = trim($inputData['category'] ?? 'Geral');
            $date = trim($inputData['date'] ?? date('d/m/Y'));
            $source = trim($inputData['source'] ?? 'manual');

            $stmt = $pdo->prepare("INSERT INTO transacoes_financeiras (id, user_id, description, amount, type, category, date, source)
                                  VALUES (:id, :user_id, :desc, :amount, :type, :category, :date, :source)
                                  ON DUPLICATE KEY UPDATE description=VALUES(description), amount=VALUES(amount), type=VALUES(type)");
            $stmt->execute([
                ':id' => $id, ':user_id' => $userId, ':desc' => $desc, ':amount' => $amount,
                ':type' => $type, ':category' => $category, ':date' => $date, ':source' => $source
            ]);
            jsonResponse(['success' => true, 'message' => 'Transação gravada com sucesso!', 'id' => $id]);
            break;

        // ----------------------------------------------------------------------
        // Módulo Agenda e Eventos
        // ----------------------------------------------------------------------
        case 'eventos':
        case 'calendar':
            if ($method === 'GET') {
                $rows = dbSelect("SELECT * FROM eventos_agenda ORDER BY id DESC");
                jsonResponse(['success' => true, 'count' => count($rows), 'events' => $rows]);
            }
            break;

        case 'evento_salvar':
            $id = $inputData['id'] ?? ('e-' . uniqid());
            $userId = $inputData['userId'] ?? 'usr-romildo-master';
            $title = trim($inputData['title'] ?? '');
            $datetime = trim($inputData['datetime'] ?? '');
            $category = in_array($inputData['category'] ?? '', ['Reunião', 'Tarefa', 'Pessoal', 'Lembrete']) ? $inputData['category'] : 'Tarefa';
            $completed = !empty($inputData['completed']) ? 1 : 0;

            $stmt = $pdo->prepare("INSERT INTO eventos_agenda (id, user_id, title, datetime, category, completed)
                                  VALUES (:id, :user_id, :title, :datetime, :category, :completed)
                                  ON DUPLICATE KEY UPDATE title=VALUES(title), datetime=VALUES(datetime), completed=VALUES(completed)");
            $stmt->execute([':id' => $id, ':user_id' => $userId, ':title' => $title, ':datetime' => $datetime, ':category' => $category, ':completed' => $completed]);
            jsonResponse(['success' => true, 'message' => 'Evento salvo com sucesso!', 'id' => $id]);
            break;

        // ----------------------------------------------------------------------
        // Módulo Arcade / Pontuações
        // ----------------------------------------------------------------------
        case 'arcade':
            $game = $_GET['game'] ?? null;
            if ($game) {
                $rows = dbSelect("SELECT * FROM arcade_pontuacoes WHERE game_key = :g ORDER BY score DESC LIMIT 50", [':g' => $game]);
            } else {
                $rows = dbSelect("SELECT * FROM arcade_pontuacoes ORDER BY score DESC LIMIT 100");
            }
            jsonResponse(['success' => true, 'scores' => $rows]);
            break;

        case 'arcade_salvar':
            $id = $inputData['id'] ?? ('sc-' . uniqid());
            $gameKey = trim($inputData['gameKey'] ?? 'arcade');
            $playerName = trim($inputData['playerName'] ?? 'Romildo (Master)');
            $score = intval($inputData['score'] ?? 0);
            $level = intval($inputData['levelReached'] ?? 1);

            $stmt = $pdo->prepare("INSERT INTO arcade_pontuacoes (id, game_key, player_name, score, level_reached)
                                  VALUES (:id, :game, :name, :score, :level)");
            $stmt->execute([':id' => $id, ':game' => $gameKey, ':name' => $playerName, ':score' => $score, ':level' => $level]);
            jsonResponse(['success' => true, 'message' => 'Recorde gravado com sucesso no MySQL!', 'id' => $id]);
            break;

        // ----------------------------------------------------------------------
        // Sincronização Integral do Cofre JARVES (Full Vault Sync)
        // ----------------------------------------------------------------------
        case 'sync_all':
        case 'sync_vault':
            if ($method !== 'POST') {
                jsonError("Método deve ser POST para sincronização.", 405);
            }

            $pdo->beginTransaction();

            // Sincroniza usuários
            if (!empty($inputData['users']) && is_array($inputData['users'])) {
                $stmt = $pdo->prepare("
                    INSERT INTO usuarios (id, name, username, password, email, phone, role, status, last_access, last_ip, action_logs_count)
                    VALUES (:id, :name, :username, :password, :email, :phone, :role, :status, :last_access, :last_ip, :action_logs_count)
                    ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), role=VALUES(role), status=VALUES(status)
                ");
                foreach ($inputData['users'] as $u) {
                    $stmt->execute([
                        ':id'               => $u['id'],
                        ':name'             => $u['name'],
                        ':username'         => $u['username'] ?? $u['name'],
                        ':password'         => !empty($u['password']) ? $u['password'] : 'User2026@',
                        ':email'            => $u['email'],
                        ':phone'            => $u['phone'] ?? '',
                        ':role'             => $u['role'] ?? 'User',
                        ':status'           => $u['status'] ?? 'Ativo',
                        ':last_access'      => $u['lastAccess'] ?? 'Hoje',
                        ':last_ip'          => $u['lastIp'] ?? '127.0.0.1',
                        ':action_logs_count'=> intval($u['actionLogsCount'] ?? 0)
                    ]);
                }
            }

            // Sincroniza transações financeiras
            if (!empty($inputData['transactions']) && is_array($inputData['transactions'])) {
                $stmt = $pdo->prepare("
                    INSERT INTO transacoes_financeiras (id, user_id, description, amount, type, category, date, source)
                    VALUES (:id, :user_id, :desc, :amount, :type, :category, :date, :source)
                    ON DUPLICATE KEY UPDATE description=VALUES(description), amount=VALUES(amount), type=VALUES(type)
                ");
                foreach ($inputData['transactions'] as $t) {
                    $stmt->execute([
                        ':id'       => $t['id'],
                        ':user_id'  => $t['userId'] ?? 'usr-romildo-master',
                        ':desc'     => $t['description'],
                        ':amount'   => floatval($t['amount']),
                        ':type'     => $t['type'],
                        ':category' => $t['category'] ?? 'Geral',
                        ':date'     => $t['date'] ?? date('d/m/Y'),
                        ':source'   => $t['source'] ?? 'manual'
                    ]);
                }
            }

            // Grava snapshot no cofre
            $stmt = $pdo->prepare("INSERT INTO cofre_snapshots_backup (id, version, checksum, data_json, created_by)
                                  VALUES (:id, 1, :checksum, :data_json, 'Romildo')");
            $stmt->execute([
                ':id'       => 'snap-' . time(),
                ':checksum' => 'JV-' . substr(md5($inputRaw), 0, 10),
                ':data_json'=> $inputRaw
            ]);

            $pdo->commit();
            jsonResponse([
                'success'   => true,
                'message'   => 'Cofre e banco emribeir_jarves 100% sincronizados!',
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            break;

        // ----------------------------------------------------------------------
        // Módulo Fish Audio TTS (Síntese e Validação de Voz do Jarvis via PHP)
        // ----------------------------------------------------------------------
        case 'jarvis/tts':
        case 'jarves/tts':
        case 'tts':
            $text = trim($inputData['text'] ?? '');
            if (empty($text)) {
                jsonError("O parâmetro 'text' é obrigatório para síntese de voz.", 400);
            }

            $apiKey = !empty($inputData['apiKey']) ? trim($inputData['apiKey']) : 'sk-fish-tNdqjK_XbkVx27B8kO-TuYlx7EP6h5OnhWg3xe0W6us';
            $voiceId = !empty($inputData['reference_id']) ? trim($inputData['reference_id']) : (!empty($inputData['voiceId']) ? trim($inputData['voiceId']) : '82d13948027e4be69892dd3d0104e681');
            $model = !empty($inputData['model']) ? trim($inputData['model']) : 's2.1-pro-free';
            $format = !empty($inputData['format']) ? trim($inputData['format']) : 'mp3';

            $postData = json_encode([
                'text' => $text,
                'reference_id' => $voiceId,
                'format' => $format,
            ]);

            $ch = curl_init('https://api.fish.audio/v1/tts');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $apiKey,
                'Content-Type: application/json',
                'model: ' . $model,
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 20);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

            $audioResult = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($httpCode === 200 && $audioResult) {
                header('Content-Type: audio/mpeg');
                header('Cache-Control: public, max-age=86400');
                echo $audioResult;
                exit;
            } else {
                jsonError("Falha na síntese Fish Audio (HTTP {$httpCode}): " . ($curlError ?: $audioResult), $httpCode >= 400 ? $httpCode : 500);
            }
            break;

        case 'jarvis/tts/test':
        case 'jarves/tts/test':
        case 'tts/test':
        case 'tts_test':
            $apiKey = !empty($inputData['apiKey']) ? trim($inputData['apiKey']) : 'sk-fish-tNdqjK_XbkVx27B8kO-TuYlx7EP6h5OnhWg3xe0W6us';
            $voiceId = !empty($inputData['voiceId']) ? trim($inputData['voiceId']) : (!empty($inputData['reference_id']) ? trim($inputData['reference_id']) : '82d13948027e4be69892dd3d0104e681');
            $model = !empty($inputData['model']) ? trim($inputData['model']) : 's2.1-pro-free';

            $postData = json_encode([
                'text' => 'Teste de áudio Fish Audio validado com sucesso.',
                'reference_id' => $voiceId,
                'format' => 'mp3',
            ]);

            $ch = curl_init('https://api.fish.audio/v1/tts');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $apiKey,
                'Content-Type: application/json',
                'model: ' . $model,
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

            $testResult = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($httpCode === 200 && $testResult) {
                jsonResponse([
                    'success'  => true,
                    'message'  => 'Conexão com Fish Audio validada com sucesso! API Key e Voice ID estão operacionais.',
                    'voiceId'  => $voiceId,
                    'model'    => $model,
                    'provider' => 'PHP cPanel/Apache Proxy',
                ]);
            } else {
                jsonError("Falha na validação com Fish Audio (HTTP {$httpCode}): " . ($curlError ?: $testResult), $httpCode >= 400 ? $httpCode : 500);
            }
            break;

        // ----------------------------------------------------------------------
        // Módulo de Músicas MP3 do Usuário (Isolamento Individual por user_id)
        // ----------------------------------------------------------------------
        case 'usuario_musicas':
        case 'user_tracks':
            $userId = trim($_GET['user_id'] ?? ($inputData['userId'] ?? ($inputData['user_id'] ?? 'usr-romildo-master')));
            if ($method === 'GET') {
                $rows = dbSelect("SELECT * FROM usuario_musicas_mp3 WHERE user_id = :uid ORDER BY id DESC", [':uid' => $userId]);
                jsonResponse(['success' => true, 'count' => count($rows), 'tracks' => $rows]);
            } elseif ($method === 'POST') {
                $title = trim($inputData['title'] ?? '');
                $artist = trim($inputData['artist'] ?? 'Artista');
                $url = trim($inputData['url'] ?? '');
                $genre = trim($inputData['genre'] ?? 'Geral');
                $sourceType = trim($inputData['sourceType'] ?? 'url');
                $duration = intval($inputData['duration'] ?? 0);

                if (empty($title) || empty($url)) {
                    jsonError("Título e URL da música MP3 são obrigatórios.", 400);
                }

                $stmt = $pdo->prepare("INSERT INTO usuario_musicas_mp3 (user_id, title, artist, url, genre, source_type, duration_seconds) VALUES (:uid, :title, :artist, :url, :genre, :source, :dur)");
                $stmt->execute([
                    ':uid'    => $userId,
                    ':title'  => $title,
                    ':artist' => $artist,
                    ':url'    => $url,
                    ':genre'  => $genre,
                    ':source' => $sourceType,
                    ':dur'    => $duration,
                ]);
                $newId = $pdo->lastInsertId();
                jsonResponse(['success' => true, 'message' => 'Música MP3 salva no banco de dados com sucesso!', 'id' => $newId]);
            } elseif ($method === 'DELETE') {
                $trackId = intval($_GET['id'] ?? ($inputData['id'] ?? 0));
                if ($trackId <= 0) {
                    jsonError("ID da faixa inválido.", 400);
                }
                $stmt = $pdo->prepare("DELETE FROM usuario_musicas_mp3 WHERE id = :id AND user_id = :uid");
                $stmt->execute([':id' => $trackId, ':uid' => $userId]);
                jsonResponse(['success' => true, 'message' => 'Faixa removida com sucesso.']);
            }
            break;

        // ----------------------------------------------------------------------
        // Módulo de Links de Vídeos do Usuário (YouTube / Dailymotion / Direto)
        // ----------------------------------------------------------------------
        case 'usuario_videos':
        case 'user_videos':
            $userId = trim($_GET['user_id'] ?? ($inputData['userId'] ?? ($inputData['user_id'] ?? 'usr-romildo-master')));
            if ($method === 'GET') {
                $rows = dbSelect("SELECT * FROM usuario_videos_links WHERE user_id = :uid ORDER BY id DESC", [':uid' => $userId]);
                jsonResponse(['success' => true, 'count' => count($rows), 'videos' => $rows]);
            } elseif ($method === 'POST') {
                $title = trim($inputData['title'] ?? '');
                $url = trim($inputData['url'] ?? '');
                $platform = trim($inputData['platform'] ?? 'youtube');
                $category = trim($inputData['category'] ?? 'Geral');
                $tags = trim($inputData['tags'] ?? '');
                $videoId = trim($inputData['videoId'] ?? '');

                if (empty($title) || empty($url)) {
                    jsonError("Título e Link do vídeo são obrigatórios.", 400);
                }

                $stmt = $pdo->prepare("INSERT INTO usuario_videos_links (user_id, title, url, platform, video_id, category, tags) VALUES (:uid, :title, :url, :plat, :vid, :cat, :tags)");
                $stmt->execute([
                    ':uid'   => $userId,
                    ':title' => $title,
                    ':url'   => $url,
                    ':plat'  => $platform,
                    ':vid'   => $videoId,
                    ':cat'   => $category,
                    ':tags'  => $tags,
                ]);
                $newId = $pdo->lastInsertId();
                jsonResponse(['success' => true, 'message' => 'Link de vídeo salvo no banco de dados com sucesso!', 'id' => $newId]);
            } elseif ($method === 'DELETE') {
                $vidId = intval($_GET['id'] ?? ($inputData['id'] ?? 0));
                if ($vidId <= 0) {
                    jsonError("ID do vídeo inválido.", 400);
                }
                $stmt = $pdo->prepare("DELETE FROM usuario_videos_links WHERE id = :id AND user_id = :uid");
                $stmt->execute([':id' => $vidId, ':uid' => $userId]);
                jsonResponse(['success' => true, 'message' => 'Vídeo removido com sucesso.']);
            }
            break;

        // ----------------------------------------------------------------------
        // Importação em Massa de Mídias (JSON) com Isolamento Individual
        // ----------------------------------------------------------------------
        case 'usuario_midia_import_json':
            $userId = trim($inputData['userId'] ?? ($inputData['user_id'] ?? 'usr-romildo-master'));
            $tracks = is_array($inputData['tracks'] ?? null) ? $inputData['tracks'] : [];
            $videos = is_array($inputData['videos'] ?? null) ? $inputData['videos'] : [];

            $tracksImported = 0;
            $videosImported = 0;

            $pdo->beginTransaction();
            try {
                if (!empty($tracks)) {
                    $stmtTrack = $pdo->prepare("INSERT INTO usuario_musicas_mp3 (user_id, title, artist, url, genre, source_type, duration_seconds) VALUES (:uid, :title, :artist, :url, :genre, :source, :dur)");
                    foreach ($tracks as $t) {
                        $title = trim($t['title'] ?? '');
                        $url = trim($t['url'] ?? '');
                        if (empty($title) || empty($url)) continue;
                        $artist = trim($t['artist'] ?? 'Artista');
                        $genre = trim($t['genre'] ?? 'Geral');
                        $source = trim($t['sourceType'] ?? 'url');
                        $dur = intval($t['duration'] ?? 0);
                        $stmtTrack->execute([
                            ':uid' => $userId, ':title' => $title, ':artist' => $artist,
                            ':url' => $url, ':genre' => $genre, ':source' => $source, ':dur' => $dur
                        ]);
                        $tracksImported++;
                    }
                }

                if (!empty($videos)) {
                    $stmtVid = $pdo->prepare("INSERT INTO usuario_videos_links (user_id, title, url, platform, video_id, category, tags) VALUES (:uid, :title, :url, :plat, :vid, :cat, :tags)");
                    foreach ($videos as $v) {
                        $title = trim($v['title'] ?? '');
                        $url = trim($v['url'] ?? '');
                        if (empty($title) || empty($url)) continue;
                        $platform = trim($v['platform'] ?? 'youtube');
                        $videoId = trim($v['videoId'] ?? '');
                        $category = trim($v['category'] ?? 'Geral');
                        $tags = is_array($v['tags'] ?? null) ? implode(', ', $v['tags']) : trim($v['tags'] ?? '');
                        $stmtVid->execute([
                            ':uid' => $userId, ':title' => $title, ':url' => $url,
                            ':plat' => $platform, ':vid' => $videoId, ':cat' => $category, ':tags' => $tags
                        ]);
                        $videosImported++;
                    }
                }

                // Log import
                $stmtLog = $pdo->prepare("INSERT INTO usuario_midia_import_logs (user_id, imported_tracks_count, imported_videos_count, notes) VALUES (:uid, :tc, :vc, :notes)");
                $stmtLog->execute([
                    ':uid' => $userId,
                    ':tc'  => $tracksImported,
                    ':vc'  => $videosImported,
                    ':notes' => "Importação em massa via JSON: {$tracksImported} faixas MP3 e {$videosImported} vídeos.",
                ]);

                $pdo->commit();

                jsonResponse([
                    'success' => true,
                    'message' => "Importação em massa concluída com sucesso! {$tracksImported} músicas MP3 e {$videosImported} links de vídeo foram adicionados à sua biblioteca privada.",
                    'userId' => $userId,
                    'tracksImported' => $tracksImported,
                    'videosImported' => $videosImported,
                ]);
            } catch (Exception $importErr) {
                $pdo->rollBack();
                throw $importErr;
            }
            break;

        default:
            jsonError("Ação não reconhecida: {$action}", 400);
            break;
    }
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonError("Erro no processamento da API JARVES: " . $e->getMessage(), 500);
}
?>
