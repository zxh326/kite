
export const TypesenseClusterStatusDisplay = ({ status }: { status: string }) => {

  switch (status) {
    case 'Bootstrapping':
      return status;

    case 'QuorumStateUnknown':
      return "Unknown";

    case 'QuorumReady':
      return "Ready";

    case 'QuorumNotReady':
      return "Not Ready";

    case 'QuorumNotReadyWaitATerm':
      return "Waiting";

    case 'QuorumDowngraded':
      return "Downgraded";

    case 'QuorumUpgraded':
      return "Upgraded";

    case 'QuorumNeedsAttentionMemoryOrDiskIssue':
      return "Requires Attention";

    case 'QuorumNeedsAttentionClusterIsLagging':
      return "Lagging";

    default:
      return status;
  }
}