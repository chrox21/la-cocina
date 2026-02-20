import { Badge } from '@/components/ui/badge';
import { MenuCard } from './MenuCard';
import { MenuItem } from '@/store/menu-store';

interface PairingGroupProps {
  label: string; // "Pairing A" or "Pairing B"
  mainItem: MenuItem;
  sideItem: MenuItem;
  menuId?: string;
}

export function PairingGroup({
  label,
  mainItem,
  sideItem,
  menuId,
}: PairingGroupProps) {
  return (
    <div className="mb-6">
      {/* Pairing Badge with Green Gradient */}
      <Badge
        className="mb-3 px-3 py-1 text-xs font-sans font-medium tracking-wide"
        style={{
          background: 'linear-gradient(135deg, #2D5016, #3D6B22)',
          color: '#FFFDF8',
          border: 'none',
        }}
      >
        {label}
      </Badge>

      {/* Grid Layout for Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MenuCard item={mainItem} menuId={menuId} />
        <MenuCard item={sideItem} menuId={menuId} />
      </div>
    </div>
  );
}
