import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import {
  getUserExtensions,
  toggleExtension,
  getExtensionPrices,
  purchaseExtension,
} from "wasp/client/operations";
import UserDashboardLayout from "../../user-dashboard/layout/UserDashboardLayout";
import { getEnabledExtensions } from "../registry";
import ExtensionCard from "./ExtensionCard";
import { Store } from "lucide-react";

export default function MarketplacePage({ user }: { user: AuthUser }) {
  const {
    data: userExtensions,
    isLoading: loadingExtensions,
  } = useQuery(getUserExtensions);

  const {
    data: prices,
    isLoading: loadingPrices,
  } = useQuery(getExtensionPrices);

  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [purchasingIds, setPurchasingIds] = useState<Set<string>>(new Set());

  const enabledExtensions = getEnabledExtensions();
  const isLoading = loadingExtensions || loadingPrices;

  const isExtensionActive = (extensionId: string): boolean => {
    const record = userExtensions?.find((ue) => ue.extensionId === extensionId);
    return record?.isActive ?? false;
  };

  const isExtensionPurchased = (extensionId: string): boolean => {
    const record = userExtensions?.find((ue) => ue.extensionId === extensionId);
    return record?.purchasedAt != null;
  };

  const getPrice = (extensionId: string): number => {
    if (prices && extensionId in prices) {
      return prices[extensionId];
    }
    const ext = enabledExtensions.find((e) => e.id === extensionId);
    return ext?.defaultPrice ?? 0;
  };

  const handleToggle = async (extensionId: string, isActive: boolean) => {
    setTogglingIds((prev) => new Set(prev).add(extensionId));
    try {
      await toggleExtension({ extensionId, isActive });
    } catch (err) {
      console.error("Failed to toggle extension:", err);
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(extensionId);
        return next;
      });
    }
  };

  const handlePurchase = async (extensionId: string) => {
    setPurchasingIds((prev) => new Set(prev).add(extensionId));
    try {
      const { sessionUrl } = await purchaseExtension({ extensionId });
      if (sessionUrl) {
        window.location.href = sessionUrl;
      }
      // sessionUrl is null when Stripe isn't configured (direct activation).
      // The query cache will auto-refetch and show the extension as purchased.
    } catch (err) {
      console.error("Failed to purchase extension:", err);
    } finally {
      setPurchasingIds((prev) => {
        const next = new Set(prev);
        next.delete(extensionId);
        return next;
      });
    }
  };

  return (
    <UserDashboardLayout user={user}>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Store className="h-7 w-7" />
          <h1 className="text-2xl font-bold">Marketplace</h1>
        </div>
        <p className="text-muted-foreground">
          Browse and activate extensions to add new capabilities.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading extensions...</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {enabledExtensions.map((ext) => (
            <ExtensionCard
              key={ext.id}
              extension={ext}
              isActive={isExtensionActive(ext.id)}
              onToggle={handleToggle}
              isToggling={togglingIds.has(ext.id)}
              isPurchased={isExtensionPurchased(ext.id)}
              price={getPrice(ext.id)}
              onPurchase={handlePurchase}
              isPurchasing={purchasingIds.has(ext.id)}
            />
          ))}
        </div>
      )}

      {!isLoading && enabledExtensions.length === 0 && (
        <div className="text-muted-foreground py-12 text-center">
          No extensions available yet. Check back soon!
        </div>
      )}
    </UserDashboardLayout>
  );
}
