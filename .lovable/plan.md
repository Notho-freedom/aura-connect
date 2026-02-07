

# Plan de Développement - Suite Logique de VidCall

## Analyse de l'État Actuel

L'application dispose actuellement de :
- **Authentification Google** avec accès aux contacts
- **Interface responsive** (FaceTime desktop / WhatsApp mobile)
- **Messagerie temps réel** fonctionnelle avec Supabase
- **Gestion des contacts** avec synchronisation Google
- **Historique des appels** et statuts de présence
- **Interface d'appel vidéo** avec contrôles basiques

## Ce Qui Manque (Critique)

L'application n'a **pas de signalisation WebRTC réelle** - les appels vidéo sont actuellement en mode démonstration avec des données mockées. Impossible d'établir une vraie connexion peer-to-peer.

---

## Plan d'Implémentation en 4 Phases

### Phase 1 : Signalisation WebRTC en Temps Réel

Créer le système de signalisation nécessaire pour établir des connexions peer-to-peer entre utilisateurs.

**Fichiers à créer :**
- `src/hooks/useWebRTC.ts` - Gestion complète WebRTC (offre/réponse SDP, ICE candidates)
- `src/hooks/useCallSignaling.ts` - Signalisation via Supabase Realtime
- `supabase/functions/webrtc-signaling/index.ts` - Serveur TURN/STUN coordination

**Modifications de base de données :**
- Ajouter la table `signaling_messages` pour échanger les messages SDP/ICE
- Activer Realtime sur cette table

**Fonctionnalités :**
- Échange d'offres/réponses SDP
- Transmission des candidats ICE
- Gestion de la reconnexion automatique
- Support multi-participants (mesh network pour petits groupes)

---

### Phase 2 : Notifications d'Appels Entrants

Système de notification pour alerter les utilisateurs lorsqu'ils reçoivent un appel.

**Fichiers à créer :**
- `src/components/call/IncomingCallModal.tsx` - Modal d'appel entrant style iOS
- `src/hooks/useIncomingCalls.ts` - Écoute temps réel des appels entrants
- `src/components/call/CallRingtone.tsx` - Son de sonnerie

**Modifications :**
- `src/App.tsx` - Intégrer le listener global d'appels entrants
- `src/hooks/useCalls.ts` - Ajouter fonctions `acceptCall()` et `declineCall()`

**Fonctionnalités :**
- Notification push navigateur (optionnel)
- Modal élégant avec avatar de l'appelant
- Boutons accepter/refuser avec animations
- Timeout automatique (30s) -> appel manqué

---

### Phase 3 : Amélioration de l'Interface d'Appel

Rendre l'interface d'appel vidéo vraiment fonctionnelle avec les flux distants.

**Fichiers à modifier :**
- `src/pages/VideoCall.tsx` - Afficher les vrais flux vidéo des participants
- `src/pages/PreCall.tsx` - Enregistrer l'appel en base avant de rejoindre

**Fichiers à créer :**
- `src/components/call/ParticipantVideo.tsx` - Composant vidéo individuel
- `src/components/call/CallTimer.tsx` - Durée de l'appel en temps réel
- `src/components/call/CallQualityIndicator.tsx` - Indicateur de qualité réseau

**Fonctionnalités :**
- Grille dynamique adaptée au nombre de participants
- Picture-in-Picture pour sa propre vidéo
- Indicateurs visuels (micro coupé, caméra off, qualité réseau)
- Partage d'écran (bonus)

---

### Phase 4 : Améliorations UX & Fonctionnalités Secondaires

**Fichiers à créer :**
- `src/pages/Settings.tsx` - Page de paramètres utilisateur
- `src/components/settings/DeviceSelector.tsx` - Sélection caméra/micro
- `src/components/chat/EmojiPicker.tsx` - Sélecteur d'emojis pour messages
- `src/components/chat/FileUpload.tsx` - Envoi de fichiers/images

**Fonctionnalités :**
- Sélection des périphériques audio/vidéo
- Envoi d'images et fichiers dans le chat
- Réactions aux messages
- Mode "Ne pas déranger"
- Historique des appels détaillé avec filtres

---

## Architecture Technique WebRTC

```text
┌─────────────┐         ┌─────────────────┐         ┌─────────────┐
│   User A    │         │    Supabase     │         │   User B    │
│             │         │    Realtime     │         │             │
├─────────────┤         ├─────────────────┤         ├─────────────┤
│  1. Créer   │────────>│  Notification   │────────>│  2. Reçoit  │
│    Appel    │         │   d'appel       │         │    Appel    │
│             │         │                 │         │             │
│  3. Offre   │────────>│  SDP Offer      │────────>│  4. Réponse │
│    SDP      │         │                 │         │    SDP      │
│             │<────────│  SDP Answer     │<────────│             │
│             │         │                 │         │             │
│  5. ICE     │<───────>│  ICE Candidates │<───────>│  5. ICE     │
│ Candidates  │         │                 │         │ Candidates  │
│             │         │                 │         │             │
│  6. Connexion P2P établie - flux vidéo direct    │             │
└─────────────┴─────────────────────────────────────┴─────────────┘
```

---

## Migration Base de Données Requise

```sql
-- Table pour la signalisation WebRTC
CREATE TABLE signaling_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid REFERENCES calls(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  type text NOT NULL, -- 'offer', 'answer', 'ice-candidate', 'hangup'
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_signaling_recipient ON signaling_messages(recipient_id, created_at);

-- Activer Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE signaling_messages;

-- RLS
ALTER TABLE signaling_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert signaling messages"
ON signaling_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view their signaling messages"
ON signaling_messages FOR SELECT
USING (auth.uid() = recipient_id OR auth.uid() = sender_id);
```

---

## Ordre de Priorité Recommandé

| Priorité | Phase | Raison |
|----------|-------|--------|
| 1 | Phase 1 & 2 | Sans signalisation, l'app ne peut pas faire d'appels réels |
| 2 | Phase 3 | Améliore l'UX des appels une fois fonctionnels |
| 3 | Phase 4 | Fonctionnalités secondaires pour une expérience complète |

---

## Estimation du Travail

- **Phase 1** : Complexité élevée - WebRTC et signalisation temps réel
- **Phase 2** : Complexité moyenne - UI et écoute Realtime
- **Phase 3** : Complexité moyenne - Refactoring de l'interface existante
- **Phase 4** : Complexité faible à moyenne - Fonctionnalités indépendantes

