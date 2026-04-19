<?php
namespace Model;

use PDO;

class PrenotazioneRepository
{
    public function __construct(private PDO $pdo) {
        private PDO $pdo,
        private ParcheggioRepository $parcheggioRepository
    }

    public function findAll(): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM prenotazioni ORDER BY created_at DESC');
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function findById(string $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM prenotazioni WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function findByCodice(string $codice): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM prenotazioni WHERE LOWER(codice_prenotazione) = LOWER(:codice)'
        );
        $stmt->execute(['codice' => $codice]);
        return $stmt->fetch() ?: null;
    }

    public function findByUtente(string $utenteId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM prenotazioni WHERE utente_id = :id ORDER BY created_at DESC'
        );
        $stmt->execute(['id' => $utenteId]);
        return $stmt->fetchAll();
    }

    public function findByParcheggio(string $parcheggioId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM prenotazioni WHERE parcheggio_id = :id ORDER BY created_at DESC'
        );
        $stmt->execute(['id' => $parcheggioId]);
        return $stmt->fetchAll();
    }

    // Ritorna il numero di posti disponibili in un determinato lasso di tempo
    // TODO: Verificare funzionamento
    public function getPostiDisponibili(string $parcheggio_id, string $inizio, string $fine): int
    {
        $totale = $this->parcheggioRepository->getPostiTotaliParcheggio($parcheggio_id);

        $stmt = $this->pdo->prepare(
            "SELECT COUNT(*) FROM prenotazioni
            WHERE parcheggio_id = :parcheggio_id
            AND stato = 'attiva'
            AND data_ora_inizio < :fine
            AND data_ora_fine > :inizio"
        );
        $stmt->execute([
            'parcheggio_id' => $parcheggio_id,
            'inizio'        => $inizio,
            'fine'          => $fine,
        ]);

        $prenotazioniAttive = (int) $stmt->fetchColumn();
        return max(0, $totale - $prenotazioniAttive);
    }

    // Creazione prenotazione: ritorna null se ci sono errori nel DB o mancanza di
    // disponibilitá
    // TODO: Verificare funzionamento
    public function create(array $data): ?array
    {
        $disponibili = $this->getPostiDisponibili(
            $data['parcheggio_id'],
            $data['data_ora_inizio'],
            $data['data_ora_fine']
        );

        if ($disponibili <= 0) {
            return null;
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO prenotazioni
            (id, codice_prenotazione, utente_id, parcheggio_id, parcheggio_nome, targa, data_ora_inizio, data_ora_fine)
            VALUES
            (:id, :codice, :utente_id, :parcheggio_id, :parcheggio_nome, :targa, :inizio, :fine)'
        );

        $ok = $stmt->execute([
            'id'              => $data['id'],
            'codice'          => $data['codice_prenotazione'],
            'utente_id'       => $data['utente_id'],
            'parcheggio_id'   => $data['parcheggio_id'],
            'parcheggio_nome' => $data['parcheggio_nome'],
            'targa'           => $data['targa'],
            'inizio'          => $data['data_ora_inizio'],
            'fine'            => $data['data_ora_fine'],
        ]);

        if (!$ok) {
            return null;
        }

        return $this->findById($data['id']);
    }

    public function update(string $id, array $data): bool
    {
        $stmt = $this->pdo->prepare(
            "UPDATE prenotazioni
             SET targa = :targa, data_ora_inizio = :inizio, data_ora_fine = :fine
             WHERE id = :id AND stato = 'attiva'"
        );
        return $stmt->execute([
            'targa'  => strtoupper($data['targa']),
            'inizio' => $data['data_ora_inizio'],
            'fine'   => $data['data_ora_fine'],
            'id'     => $id,
        ]);
    }

    // Ritorna true se l'annullamento è andato a buon fine (la prenotazione era attiva)
    public function cancel(string $id): bool
    {
        $stmt = $this->pdo->prepare(
            "UPDATE prenotazioni SET stato = 'annullata' WHERE id = :id AND stato = 'attiva'"
        );
        $stmt->execute(['id' => $id]);
        return $stmt->rowCount() > 0;
    }

    // Statistiche per l'admin dashboard
    // Corrisponde esattamente a adminStats in mockData.js:
    // { totalBookings, activeBookings, totalRevenue, co2Saved, mostUsedParkings }
    public function getStats(): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT
               COUNT(*) AS total,
               SUM(CASE WHEN stato = 'attiva' THEN 1 ELSE 0 END) AS attive
             FROM prenotazioni"
        );
        $stmt->execute();
        $counts = $stmt->fetch();

        // Calcola il ricavo totale: per ogni prenotazione ore * tariffa del parcheggio
        $stmt2 = $this->pdo->prepare(
            "SELECT SUM(
                EXTRACT(EPOCH FROM (pr.data_ora_fine - pr.data_ora_inizio)) / 3600.0
                * pa.tariffa_oraria
             ) AS revenue
             FROM prenotazioni pr
             JOIN parcheggi pa ON pa.id = pr.parcheggio_id"
        );
        $stmt2->execute();
        $rev = $stmt2->fetch();

        // Top 3 parcheggi per numero di prenotazioni
        $stmt3 = $this->pdo->prepare(
            "SELECT parcheggio_nome AS nome, COUNT(*) AS prenotazioni
             FROM prenotazioni
             GROUP BY parcheggio_nome
             ORDER BY prenotazioni DESC
             LIMIT 3"
        );
        $stmt3->execute();

        $revenue = round((float)($rev['revenue'] ?? 0), 2);

        return [
            'totalBookings'    => (int) $counts['total'],
            'activeBookings'   => (int) $counts['attive'],
            'totalRevenue'     => $revenue,
            'co2Saved'         => round($revenue * 0.026, 1), // stima kg CO2
            'mostUsedParkings' => $stmt3->fetchAll(),
        ];
    }
}