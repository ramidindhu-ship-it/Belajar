import React from 'react';
import {
  Wallet,
  Landmark,
  CreditCard,
  Receipt,
  PiggyBank,
  Sparkles,
  TrendingUp,
  PieChart,
  Utensils,
  HeartPulse,
  Car,
  ShoppingBag,
  Users,
  Package,
  Home,
  Zap,
  Wifi,
  Film,
  FileText,
  Briefcase,
  Percent,
  Gift,
  Coins,
  Shield,
  Award,
} from 'lucide-react';

interface AccountIconProps {
  name: string;
  className?: string;
}

export const AccountIcon: React.FC<AccountIconProps> = ({ name, className = 'w-5 h-5' }) => {
  switch (name.toLowerCase()) {
    case 'payments':
    case 'coins':
      return <Coins className={className} />;
    case 'account_balance':
    case 'landmark':
      return <Landmark className={className} />;
    case 'account_balance_wallet':
    case 'wallet':
      return <Wallet className={className} />;
    case 'savings':
    case 'piggy_bank':
      return <PiggyBank className={className} />;
    case 'credit_card':
      return <CreditCard className={className} />;
    case 'receipt':
    case 'receipt_long':
      return <Receipt className={className} />;
    case 'sparkles':
    case 'stars':
      return <Sparkles className={className} />;
    case 'trending_up':
      return <TrendingUp className={className} />;
    case 'insights':
    case 'pie_chart':
      return <PieChart className={className} />;
    case 'restaurant':
    case 'utensils':
      return <Utensils className={className} />;
    case 'medical_services':
    case 'favorite':
      return <HeartPulse className={className} />;
    case 'directions_car':
    case 'car':
      return <Car className={className} />;
    case 'shopping_cart':
    case 'shopping_bag':
      return <ShoppingBag className={className} />;
    case 'users':
      return <Users className={className} />;
    case 'package':
      return <Package className={className} />;
    case 'domain':
    case 'home':
      return <Home className={className} />;
    case 'bolt':
    case 'zap':
      return <Zap className={className} />;
    case 'wifi':
      return <Wifi className={className} />;
    case 'movie':
    case 'film':
      return <Film className={className} />;
    case 'work':
    case 'briefcase':
      return <Briefcase className={className} />;
    case 'card_giftcard':
    case 'gift':
      return <Gift className={className} />;
    case 'percent':
      return <Percent className={className} />;
    case 'award':
      return <Award className={className} />;
    case 'shield':
      return <Shield className={className} />;
    default:
      return <FileText className={className} />;
  }
};
