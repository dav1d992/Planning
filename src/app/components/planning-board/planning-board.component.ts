import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Database, ref, onValue } from '@angular/fire/database';
import { SessionService } from '../../services/session.service';
import { ParticipantCardComponent } from '../participant-card/participant-card.component';
import type { Participant } from '../../models/participant.model';
import {
  trigger,
  transition,
  style,
  animate,
  animation,
} from '@angular/animations';

@Component({
  selector: 'app-planning-board',
  standalone: true,
  imports: [CommonModule, ParticipantCardComponent],
  templateUrl: './planning-board.component.html',
  styleUrl: './planning-board.component.scss',
  animations: [
    trigger('voteReveal', [
      transition(':enter', [
        style({ opacity: 0, transform: 'rotate(0deg)' }),
        animate(
          '2s linear',
          style({ opacity: 1, transform: 'rotate(7200deg)' })
        ),
      ]),
    ]),
  ],
})
export class PlanningBoardComponent {
  private route = inject(ActivatedRoute);
  private db = inject(Database);
  private service = inject(SessionService);

  sessionId = this.route.snapshot.paramMap.get('sessionId');
  participants: Participant[] = [];
  isRevealed = false;
  isOwner = false;
  isDropdownOpen = false;
  ownerName = '';

  voteOptions: string[] = [];
  currentParticipantId = '';
  currentParticipant?: Participant;

  private readonly votePresets: Record<string, string[]> = {
    fibonacci: ['1', '2', '3', '5', '8', '13', '?'],
    onetoten: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '?'],
    double: ['2', '4', '8', '16', '32', '64', '128', '?'],
  };

  constructor() {
    this.setVoteType('onetoten');
    const sessionRef = ref(this.db, `sessions/${this.sessionId}`);
    const participantsRef = ref(
      this.db,
      `sessions/${this.sessionId}/participants`
    );

    onValue(participantsRef, (snapshot) => {
      const data: Record<string, Omit<Participant, 'id'>> = snapshot.val() ||
      {};

      this.participants = Object.entries(data).map(
        ([id, value]): Participant => {
          const participant: Participant = { id, ...value };

          if (id === this.currentParticipantId) {
            this.currentParticipant = participant;
          }
          return participant;
        }
      );
    });

    onValue(sessionRef, (snapshot) => {
      const data = snapshot.val();
      this.isRevealed = data?.isRevealed;
      this.isOwner = data?.isOwner;
      this.ownerName = data?.ownerName || '';

      const voteType = data?.voteType || 'onetoten';
      this.voteOptions = this.votePresets[voteType];
    });

    this.currentParticipantId = localStorage.getItem('participantId') || '';
  }

  setVoteType(type: 'fibonacci' | 'onetoten' | 'double') {
    if (!this.sessionId) return;
    this.voteOptions = this.votePresets[type];
    this.service.updateVoteType(this.sessionId, type);
  }

  vote(vote: string) {
    if (!this.currentParticipantId || !this.sessionId) return;
    this.service.vote(this.sessionId, this.currentParticipantId, vote);
  }

  reveal() {
    if (!this.sessionId) return;

    this.service.reveal(this.sessionId);
  }

  newRound() {
    if (!this.sessionId) return;
    this.service.newRound(this.sessionId);
  }

  getJoinLink() {
    const currentUrl = window.location.href;
    const joinUrl = currentUrl.replace('/session/', '/join/');

    navigator.clipboard.writeText(joinUrl);
  }

  get numericVotes(): number[] {
    return this.participants
      .map((p) => Number(p.vote))
      .filter((v) => !Number.isNaN(v));
  }

  get highestVote(): number | null {
    const votes = this.numericVotes;
    return votes.length ? Math.max(...votes) : null;
  }

  get lowestVote(): number | null {
    const votes = this.numericVotes;
    return votes.length ? Math.min(...votes) : null;
  }
}
