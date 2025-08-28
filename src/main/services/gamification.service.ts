export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  unlocked: boolean;
  unlockedAt?: Date;
  category: 'requests' | 'languages' | 'streaks' | 'special';
}

export interface AvatarLevel {
  level: number;
  minPoints: number;
  maxPoints: number;
  title: string;
  description: string;
  avatarUnlock: string;
  color: string;
}

export interface OutfitItem {
  id: string;
  name: string;
  description: string;
  category: 'outfit' | 'accessory' | 'background' | 'frame';
  cost: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  image: string;
  unlocked: boolean;
}

export class GamificationService {
  private readonly POINTS_PER_REQUEST = 10;
  private readonly BONUS_POINTS_MULTIPLIER = 1.5;
  private readonly STREAK_BONUS_THRESHOLD = 5;
  private readonly DAILY_BONUS_POINTS = 50;

  private achievements: Achievement[] = [
    {
      id: 'first_request',
      name: 'First Steps',
      description: 'Complete your first code explanation request',
      icon: '🚀',
      points: 25,
      unlocked: false,
      category: 'requests'
    },
    {
      id: 'language_explorer',
      name: 'Language Explorer',
      description: 'Get explanations in 5 different programming languages',
      icon: '🌍',
      points: 100,
      unlocked: false,
      category: 'languages'
    },
    {
      id: 'streak_master',
      name: 'Streak Master',
      description: 'Complete 10 requests in a single day',
      icon: '🔥',
      points: 200,
      unlocked: false,
      category: 'streaks'
    },
    {
      id: 'code_scholar',
      name: 'Code Scholar',
      description: 'Reach level 10',
      icon: '🎓',
      points: 500,
      unlocked: false,
      category: 'special'
    }
  ];

  private avatarLevels: AvatarLevel[] = [
    { level: 1, minPoints: 0, maxPoints: 99, title: 'Code Novice', description: 'Just getting started', avatarUnlock: 'default', color: '#6b7280' },
    { level: 2, minPoints: 100, maxPoints: 199, title: 'Code Explorer', description: 'Learning the basics', avatarUnlock: 'explorer', color: '#3b82f6' },
    { level: 3, minPoints: 200, maxPoints: 299, title: 'Code Apprentice', description: 'Building knowledge', avatarUnlock: 'apprentice', color: '#10b981' },
    { level: 4, minPoints: 300, maxPoints: 399, title: 'Code Developer', description: 'Getting comfortable', avatarUnlock: 'developer', color: '#f59e0b' },
    { level: 5, minPoints: 400, maxPoints: 499, title: 'Code Builder', description: 'Creating solutions', avatarUnlock: 'builder', color: '#8b5cf6' },
    { level: 6, minPoints: 500, maxPoints: 599, title: 'Code Architect', description: 'Designing systems', avatarUnlock: 'architect', color: '#ec4899' },
    { level: 7, minPoints: 600, maxPoints: 699, title: 'Code Master', description: 'Expert level', avatarUnlock: 'master', color: '#ef4444' },
    { level: 8, minPoints: 700, maxPoints: 799, title: 'Code Legend', description: 'Legendary status', avatarUnlock: 'legend', color: '#fbbf24' },
    { level: 9, minPoints: 800, maxPoints: 899, title: 'Code Sage', description: 'Wise and experienced', avatarUnlock: 'sage', color: '#84cc16' },
    { level: 10, minPoints: 900, maxPoints: 999, title: 'Code Grandmaster', description: 'Ultimate achievement', avatarUnlock: 'grandmaster', color: '#06b6d4' }
  ];

  private outfitItems: OutfitItem[] = [
    // Basic outfits
    { id: 'basic_outfit', name: 'Basic Outfit', description: 'Simple and clean', category: 'outfit', cost: 0, rarity: 'common', image: 'basic_outfit.png', unlocked: true },
    { id: 'casual_outfit', name: 'Casual Coder', description: 'Comfortable coding attire', category: 'outfit', cost: 50, rarity: 'common', image: 'casual_outfit.png', unlocked: false },
    { id: 'formal_outfit', name: 'Formal Developer', description: 'Professional appearance', category: 'outfit', cost: 100, rarity: 'rare', image: 'formal_outfit.png', unlocked: false },
    
    // Accessories
    { id: 'glasses', name: 'Smart Glasses', description: 'Look more intelligent', category: 'accessory', cost: 75, rarity: 'common', image: 'glasses.png', unlocked: false },
    { id: 'hat', name: 'Coding Cap', description: 'Stylish headwear', category: 'accessory', cost: 150, rarity: 'rare', image: 'hat.png', unlocked: false },
    { id: 'necklace', name: 'Debug Necklace', description: 'Mystical debugging powers', category: 'accessory', cost: 300, rarity: 'epic', image: 'necklace.png', unlocked: false },
    
    // Backgrounds
    { id: 'office_bg', name: 'Office Background', description: 'Professional workspace', category: 'background', cost: 200, rarity: 'rare', image: 'office_bg.png', unlocked: false },
    { id: 'space_bg', name: 'Space Station', description: 'Code in zero gravity', category: 'background', cost: 500, rarity: 'epic', image: 'space_bg.png', unlocked: false },
    { id: 'forest_bg', name: 'Enchanted Forest', description: 'Magical coding environment', category: 'background', cost: 1000, rarity: 'legendary', image: 'forest_bg.png', unlocked: false },
    
    // Frames
    { id: 'golden_frame', name: 'Golden Frame', description: 'Prestigious border', category: 'frame', cost: 400, rarity: 'epic', image: 'golden_frame.png', unlocked: false },
    { id: 'neon_frame', name: 'Neon Frame', description: 'Cyberpunk style', category: 'frame', cost: 800, rarity: 'legendary', image: 'neon_frame.png', unlocked: false }
  ];

  public calculatePointsForRequest(_language: string, codeLength: number, isStreak: boolean = false): number {
    let points = this.POINTS_PER_REQUEST;
    
    // Bonus for longer code
    if (codeLength > 100) {
      points += Math.floor(codeLength / 100) * 5;
    }
    
    // Bonus for streak
    if (isStreak) {
      points = Math.floor(points * this.BONUS_POINTS_MULTIPLIER);
    }
    
    // Bonus for new language (first time)
    // This would need to be tracked per user
    
    return points;
  }

  public getLevelForPoints(points: number): AvatarLevel {
    const level = this.avatarLevels.find(l => points >= l.minPoints && points <= l.maxPoints);
    return level || this.avatarLevels[0];
  }

  public getNextLevel(points: number): AvatarLevel | null {
    const currentLevel = this.getLevelForPoints(points);
    const nextLevelIndex = this.avatarLevels.findIndex(l => l.level === currentLevel.level) + 1;
    
    if (nextLevelIndex < this.avatarLevels.length) {
      return this.avatarLevels[nextLevelIndex];
    }
    
    return null;
  }

  public getProgressToNextLevel(points: number): { current: number; total: number; percentage: number } {
    const currentLevel = this.getLevelForPoints(points);
    const nextLevel = this.getNextLevel(points);
    
    if (!nextLevel) {
      return { current: points - currentLevel.minPoints, total: 0, percentage: 100 };
    }
    
    const current = points - currentLevel.minPoints;
    const total = nextLevel.minPoints - currentLevel.minPoints;
    const percentage = Math.min(100, Math.floor((current / total) * 100));
    
    return { current, total, percentage };
  }

  public getAchievements(): Achievement[] {
    return this.achievements;
  }

  public unlockAchievement(achievementId: string): Achievement | null {
    const achievement = this.achievements.find(a => a.id === achievementId);
    if (achievement && !achievement.unlocked) {
      achievement.unlocked = true;
      achievement.unlockedAt = new Date();
      return achievement;
    }
    return null;
  }

  public getOutfitItems(): OutfitItem[] {
    return this.outfitItems;
  }

  public getOutfitItemsByCategory(category: OutfitItem['category']): OutfitItem[] {
    return this.outfitItems.filter(item => item.category === category);
  }

  public purchaseOutfitItem(itemId: string, userPoints: number): { success: boolean; item?: OutfitItem; error?: string } {
    const item = this.outfitItems.find(i => i.id === itemId);
    
    if (!item) {
      return { success: false, error: 'Item not found' };
    }
    
    if (item.unlocked) {
      return { success: false, error: 'Item already unlocked' };
    }
    
    if (userPoints < item.cost) {
      return { success: false, error: 'Not enough points' };
    }
    
    item.unlocked = true;
    return { success: true, item };
  }

  public getDailyBonus(): number {
    // In production, this would check if user has already claimed today's bonus
    return this.DAILY_BONUS_POINTS;
  }

  public getStreakBonus(streakCount: number): number {
    if (streakCount >= this.STREAK_BONUS_THRESHOLD) {
      return Math.floor(streakCount / this.STREAK_BONUS_THRESHOLD) * 25;
    }
    return 0;
  }

  public generateLevelUpMessage(_oldLevel: number, newLevel: number): string {
    const level = this.avatarLevels.find(l => l.level === newLevel);
    if (!level) return 'Level up!';
    
    return `🎉 Level Up! You're now a ${level.title}! ${level.description}`;
  }

  public generateAchievementMessage(achievement: Achievement): string {
    return `🏆 Achievement Unlocked: ${achievement.name}! +${achievement.points} points`;
  }
}

export const gamificationService = new GamificationService();
