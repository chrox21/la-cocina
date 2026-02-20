import { Badge } from '@/components/ui/badge';
import { PairingGroup } from './PairingGroup';
import { MenuCard } from './MenuCard';
import { MenuItem } from '@/store/menu-store';

interface MenuGridProps {
  items: MenuItem[];
  menuId?: string;
}

export function MenuGrid({ items, menuId }: MenuGridProps) {
  // Group items by pairing
  const pairingA = items.filter((item) => item.pairing_group === 'A');
  const pairingB = items.filter((item) => item.pairing_group === 'B');
  const independentItems = items.filter((item) => item.pairing_group === 'independent');

  const pairingAMain = pairingA.find((item) => item.item_type === 'main');
  const pairingASide = pairingA.find((item) => item.item_type === 'side');
  const pairingBMain = pairingB.find((item) => item.item_type === 'main');
  const pairingBSide = pairingB.find((item) => item.item_type === 'side');

  const breakfast = independentItems.find((item) => item.item_type === 'breakfast');
  const drink = independentItems.find((item) => item.item_type === 'drink');

  return (
    <div className="space-y-6">
      {/* Pairing A */}
      {pairingAMain && pairingASide && (
        <PairingGroup
          label="Pairing A"
          mainItem={pairingAMain}
          sideItem={pairingASide}
          menuId={menuId}
        />
      )}

      {/* Pairing B */}
      {pairingBMain && pairingBSide && (
        <PairingGroup
          label="Pairing B"
          mainItem={pairingBMain}
          sideItem={pairingBSide}
          menuId={menuId}
        />
      )}

      {/* Extras Section (Breakfast + Drink) */}
      {(breakfast || drink) && (
        <div className="mt-8">
          {/* Extras Badge with Brown Color */}
          <Badge
            className="mb-3 px-3 py-1 text-xs font-sans font-medium tracking-wide bg-[#8B6D47] text-[#FFFDF8] border-none"
          >
            Extras
          </Badge>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {breakfast && <MenuCard item={breakfast} menuId={menuId} />}
            {drink && <MenuCard item={drink} menuId={menuId} />}
          </div>
        </div>
      )}
    </div>
  );
}
