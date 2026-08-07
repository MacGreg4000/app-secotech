# openbtp-mcp

Serveur MCP donnant à Claude l'accès aux outils d'OpenBTP (encodage d'un
dossier : client → chantier → fiche → commande).

C'est un **proxy fin** : toute la logique métier vit dans OpenBTP
(`src/lib/agent/tools/`). Ce serveur lit le catalogue via
`GET /api/agent/tools` et relaie les appels via `POST /api/agent/execute`.

> Conséquence utile : **ajouter un outil côté OpenBTP le rend disponible dans
> Claude sans toucher ni redéployer ce serveur.** Aucun nom d'outil n'est codé
> en dur ici.

## Installation

```bash
cd mcp-server
npm install
npm run build
```

## Configuration dans Claude

Ajouter au fichier de configuration MCP (Claude Desktop / Claude Code) :

```jsonc
{
  "mcpServers": {
    "openbtp": {
      "command": "node",
      "args": ["/chemin/absolu/vers/OpenBTP/mcp-server/dist/index.js"],
      "env": {
        "OPENBTP_BASE_URL": "https://openbtp.secotech.synology.me",
        "OPENBTP_API_KEY": "la-cle-en-clair"
      }
    }
  }
}
```

La clé en clair ne quitte jamais le poste : le serveur OpenBTP n'en stocke
que le SHA-256 (variable `OPENBTP_AGENT_KEYS`).

## Usage recommandé

Les outils d'écriture sont annoncés `[ÉCRITURE]` et exposent un paramètre
`dryRun`.

**Convention : toujours `dryRun` d'abord, puis exécuter après validation
humaine.** Le dry-run résout les entités, valide les données et renvoie les
valeurs calculées (notamment les totaux d'une commande) **sans rien écrire** —
c'est le moment de recouper avec le bordereau papier ou l'Excel.

## Garde-fous côté OpenBTP

- Aucun outil de suppression, de modification de statut, ni d'envoi d'email.
- Les commandes sont créées en `BROUILLON` : pas de PDF généré, budget du
  chantier non recalculé. La validation reste un geste humain dans l'app.
- Les totaux sont recalculés côté serveur, jamais repris de l'appelant.
- Anti-doublon sur les clients et refus d'écraser une commande existante.

## Dépannage

Le serveur s'arrête avec un message explicite si OpenBTP est injoignable ou si
la clé est refusée — plutôt que de démarrer en exposant zéro outil en silence.
Vérifier alors :

```bash
curl -s -H "X-API-Key: $OPENBTP_API_KEY" "$OPENBTP_BASE_URL/api/agent/tools"
```
