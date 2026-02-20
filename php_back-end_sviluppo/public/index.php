<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LAMP Stack Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .success {
            color: #28a745;
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
        }
        .error {
            color: #dc3545;
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
        }
        .info {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 LAMP Stack Test Page</h1>
        
        <h2>📋 Informazioni PHP</h2>
        <div class="info">
            <strong>Versione PHP:</strong> <?php echo phpversion(); ?><br>
            <strong>Server:</strong> <?php echo $_SERVER['SERVER_SOFTWARE']; ?><br>
            <strong>Documento Root:</strong> <?php echo $_SERVER['DOCUMENT_ROOT']; ?><br>
            <strong>Data/Ora:</strong> <?php echo date('Y-m-d H:i:s'); ?>
        </div>

        <h2>🗄️ Test Connessione Database</h2>
        <?php
        $servername = "database";
        $username = "lamp_user";
        $password = "lamp_password";
        $dbname = "lamp_db";

        try {
            // Connessione con PDO
            $pdo = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            echo '<div class="success">✅ Connessione al database MariaDB riuscita!</div>';
            
            // Test query
            $stmt = $pdo->query("SELECT VERSION() as version");
            $version = $stmt->fetch(PDO::FETCH_ASSOC);
            echo '<div class="info"><strong>Versione MariaDB:</strong> ' . $version['version'] . '</div>';
            
            // Crea una tabella di test se non exists
            $pdo->exec("CREATE TABLE IF NOT EXISTS test_table (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )");
            
            // Inserisci dati di test
            $stmt = $pdo->prepare("INSERT IGNORE INTO test_table (id, nome, email) VALUES (1, 'Mario Rossi', 'mario@example.com')");
            $stmt->execute();
            
            $stmt = $pdo->prepare("INSERT IGNORE INTO test_table (id, nome, email) VALUES (2, 'Luigi Verdi', 'luigi@example.com')");
            $stmt->execute();
            
            // Mostra i dati
            echo '<h3>📊 Dati di test dalla tabella:</h3>';
            $stmt = $pdo->query("SELECT * FROM test_table");
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if ($results) {
                echo '<table>';
                echo '<tr><th>ID</th><th>Nome</th><th>Email</th><th>Data Creazione</th></tr>';
                foreach ($results as $row) {
                    echo '<tr>';
                    echo '<td>' . htmlspecialchars($row['id']) . '</td>';
                    echo '<td>' . htmlspecialchars($row['nome']) . '</td>';
                    echo '<td>' . htmlspecialchars($row['email']) . '</td>';
                    echo '<td>' . htmlspecialchars($row['data_creazione']) . '</td>';
                    echo '</tr>';
                }
                echo '</table>';
            }
            
        } catch(PDOException $e) {
            echo '<div class="error">❌ Errore di connessione: ' . $e->getMessage() . '</div>';
        }
        ?>

        <h2>⚙️ Estensioni PHP Installate</h2>
        <div class="info">
            <?php
            $extensions = get_loaded_extensions();
            sort($extensions);
            echo '<strong>Numero estensioni caricate:</strong> ' . count($extensions) . '<br><br>';
            
            $important_extensions = ['mysqli', 'pdo', 'pdo_mysql', 'zip', 'curl', 'gd', 'mbstring', 'xml'];
            echo '<strong>Estensioni importanti:</strong><br>';
            foreach ($important_extensions as $ext) {
                $status = extension_loaded($ext) ? '✅' : '❌';
                echo "$status $ext<br>";
            }
            ?>
        </div>

        <h2>🔗 Collegamenti Utili</h2>
        <div class="info">
            <a href="http://localhost:8080" target="_blank">📊 phpMyAdmin</a> - Gestione Database<br>
            <a href="<?php echo $_SERVER['PHP_SELF']; ?>?phpinfo=1">ℹ️ PHP Info</a> - Informazioni dettagliate PHP
        </div>

        <?php
        if (isset($_GET['phpinfo']) && $_GET['phpinfo'] == 1) {
            echo '<h2>📋 PHP Info Completo</h2>';
            echo '<div style="margin-top: 20px;">';
            phpinfo();
            echo '</div>';
        }
        ?>
    </div>
</body>
</html>
