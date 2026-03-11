<?php
try {
    $pdo = new PDO('mysql:host=127.0.0.1;dbname=mommasbakeshop', 'root', '');
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    if (empty($tables)) {
        echo "No tables found.\n";
    } else {
        echo "Tables found: " . implode(', ', $tables) . "\n";
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
