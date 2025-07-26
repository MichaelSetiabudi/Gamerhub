'use client';

import { Channel, User } from '@/types';

interface UserListProps {
  channel: Channel;
}

export function UserList({ channel }: UserListProps) {
  // Group members by role
  const groupedMembers = channel.members.reduce((acc, member) => {
    const role = member.role;
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push(member);
    return acc;
  }, {} as Record<string, typeof channel.members>);

  const roleOrder = ['owner', 'admin', 'moderator', 'member'];
  const roleLabels = {
    owner: 'Owner',
    admin: 'Administrators',
    moderator: 'Moderators',
    member: 'Members'
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-discord-green';
      case 'away':
        return 'bg-discord-yellow';
      case 'busy':
        return 'bg-discord-red';
      default:
        return 'bg-discord-text-muted';
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="space-y-6">
        {roleOrder.map(role => {
          const members = groupedMembers[role] || [];
          if (members.length === 0) return null;

          return (
            <div key={role}>
              <h3 className="text-xs font-semibold text-discord-text-muted uppercase tracking-wide mb-2">
                {roleLabels[role as keyof typeof roleLabels]} — {members.length}
              </h3>
              
              <div className="space-y-1">
                {members.map((member) => {
                  const user = member.user as User;
                  return (
                    <div
                      key={user._id}
                      className="flex items-center space-x-3 p-2 rounded hover:bg-discord-dark-tertiary cursor-pointer transition-colors"
                    >
                      <div className="relative">
                        <img
                          src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                          alt={user.username}
                          className="w-8 h-8 rounded-full"
                        />
                        <div 
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-discord-dark-secondary ${getStatusColor(user.status)}`}
                        ></div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-discord-text-primary truncate">
                          {user.profile?.displayName || user.username}
                        </div>
                        {user.gameStatus?.game && (
                          <div className="text-xs text-discord-text-muted truncate">
                            Playing {user.gameStatus.game}
                          </div>
                        )}
                      </div>
                      
                      {role !== 'member' && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-discord-blurple rounded-full"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
