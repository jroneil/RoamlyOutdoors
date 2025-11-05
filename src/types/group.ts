export interface Group {
  id: string;
  title: string;
  description: string;
  ownerName: string;
  members: string[];
  bannerImage?: string;
  logoImage?: string;
  createdAt: string;
}

export type GroupFormValues = Omit<Group, 'id' | 'members' | 'createdAt'> & {
  members?: string[];
};
