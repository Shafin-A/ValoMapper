type ConnectionLike = {
  saveData?: boolean;
  effectiveType?: string;
  type?: string;
  downlink?: number;
  rtt?: number;
};

const SLOW_EFFECTIVE_TYPES = new Set(["slow-2g", "2g", "3g"]);

const getConnection = (): ConnectionLike | undefined => {
  if (typeof navigator === "undefined") return undefined;

  return (
    navigator as Navigator & { connection?: ConnectionLike }
  ).connection;
};

export const shouldWarmAllAssets = (isMobile: boolean) => {
  const connection = getConnection();

  if (connection?.saveData) return false;
  if (connection?.type === "cellular") return false;

  if (
    connection?.effectiveType &&
    SLOW_EFFECTIVE_TYPES.has(connection.effectiveType)
  ) {
    return false;
  }

  if (
    typeof connection?.downlink === "number" &&
    connection.downlink > 0 &&
    connection.downlink < 1.5
  ) {
    return false;
  }

  if (typeof connection?.rtt === "number" && connection.rtt > 300) {
    return false;
  }

  // Safari does not expose NetworkInformation, so we cannot tell Wi-Fi from
  // cellular. Be conservative on phones/tablets.
  return !isMobile;
};
