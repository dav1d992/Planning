export interface Participant {
    id: string; 
    name: string;
    isOwner: boolean;  
    hasVoted: boolean;
    vote?: string | null; 
  }
  