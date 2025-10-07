'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits, parseUnits, Address } from 'viem';
import { Loader2, Info, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTeamStaking } from '@/hooks/contracts/useTeamStaking';
import { usePerpetualPool } from '@/hooks/contracts/usePerpetualPool';
import { REWARD_TOKENS, RewardToken } from '@/constants/team';
import { PERPETUAL_POOLS } from '@/constants/crypto';

// BASE Pool address (for checking stake status)
const BASE_POOL_ADDRESS = PERPETUAL_POOLS.BASE3.contractAddress as Address;

export default function TeamStakingInterface() {
  const { address, isConnected } = useAccount();
  const {
    currentPeriod,
    isStakingPeriod,
    formattedTeamBalance,
    formattedUserStaked,
    formattedGlobalStaked,
    fullPrecisionTeamBalance,
    fullPrecisionUserStaked,
    isLoading,
    stakeTeam,
    earlyEndStake,
    endCompletedStake,
    extendStake,
    restakeExpiredStake,
    prepareClaim,
    claimRewards,
    checkPrepareClaimStatus,
    getClaimableAmount,
    checkHasClaimed,
  } = useTeamStaking();

  // Use BASE pool hook to get stake status and countdown data
  const { 
    stakeIsActive: baseStakeIsActive,
    stakeStartDay,
    stakeEndDay,
    reloadPhaseEnd,
    currentHexDay,
  } = usePerpetualPool(BASE_POOL_ADDRESS, 'BASE');

  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [selectedClaimStakeID, setSelectedClaimStakeID] = useState('');
  const [showEarlyUnstakeDialog, setShowEarlyUnstakeDialog] = useState(false);
  const [earlyUnstakeDetails, setEarlyUnstakeDetails] = useState({
    amount: '',
    penalty: '',
    afterPenalty: '',
  });
  const [stakeEndCountdown, setStakeEndCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  const stakeAmountRef = useRef<HTMLInputElement>(null);
  const unstakeAmountRef = useRef<HTMLInputElement>(null);

  // Default to current period for unstaking and claiming
  const currentStakeID = currentPeriod ? currentPeriod.toString() : '';

  // Auto-fill stake ID for claims with current period
  useEffect(() => {
    if (currentPeriod && !selectedClaimStakeID) {
      setSelectedClaimStakeID(currentPeriod.toString());
    }
  }, [currentPeriod, selectedClaimStakeID]);

  // Countdown timer for when BASE stake ends
  useEffect(() => {
    if (!baseStakeIsActive) {
      return;
    }

    const updateCountdown = () => {
      // Use hardcoded deadline from PERPETUAL_POOLS config for BASE3
      const deadline = new Date(PERPETUAL_POOLS.BASE3.deadlineUTC);
      const now = new Date();
      const secondsRemaining = Math.floor((deadline.getTime() - now.getTime()) / 1000);

      if (secondsRemaining <= 0) {
        setStakeEndCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const SECONDS_PER_DAY = 86400;
      const days = Math.floor(secondsRemaining / SECONDS_PER_DAY);
      const hours = Math.floor((secondsRemaining % SECONDS_PER_DAY) / 3600);
      const minutes = Math.floor((secondsRemaining % 3600) / 60);
      const seconds = secondsRemaining % 60;

      setStakeEndCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [baseStakeIsActive]);

  // Format number with commas
  const formatNumberWithCommas = (value: string) => {
    const parts = value.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const removeCommas = (value: string) => value.replace(/,/g, '');

  const handleAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void,
    ref: React.RefObject<HTMLInputElement>
  ) => {
    const rawValue = removeCommas(e.target.value);
    if (rawValue === '' || /^\d*\.?\d{0,8}$/.test(rawValue)) {
      setter(rawValue);
      if (ref.current) {
        const cursorPosition = ref.current.selectionStart || 0;
        const oldLength = e.target.value.length;
        const newLength = formatNumberWithCommas(rawValue).length;
        const diff = newLength - oldLength;
        setTimeout(() => {
          ref.current?.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
        }, 0);
      }
    }
  };

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) return;
    
    try {
      const amountBigInt = parseUnits(stakeAmount, 8);
      await stakeTeam(amountBigInt);
      setStakeAmount('');
      alert('Successfully staked TEAM!');
    } catch (error: any) {
      console.error('Stake error:', error);
      alert(error.message || 'Failed to stake TEAM');
    }
  };

  const handleEarlyEndStake = () => {
    if (!currentStakeID || !unstakeAmount || parseFloat(unstakeAmount) <= 0) return;
    
    const penalty = parseFloat(unstakeAmount) * 0.0369;
    const afterPenalty = parseFloat(unstakeAmount) - penalty;
    
    setEarlyUnstakeDetails({
      amount: formatNumberWithCommas(unstakeAmount),
      penalty: penalty.toFixed(8),
      afterPenalty: afterPenalty.toFixed(8),
    });
    
    setShowEarlyUnstakeDialog(true);
  };

  const confirmEarlyEndStake = async () => {
    if (!currentStakeID || !unstakeAmount) return;
    
    setShowEarlyUnstakeDialog(false);
    
    try {
      const stakeIDBigInt = BigInt(currentStakeID);
      const amountBigInt = parseUnits(unstakeAmount, 8);
      await earlyEndStake(stakeIDBigInt, amountBigInt);
      setUnstakeAmount('');
      alert('Successfully unstaked TEAM (with penalty)!');
    } catch (error: any) {
      console.error('Early end stake error:', error);
      alert(error.message || 'Failed to unstake TEAM');
    }
  };

  const handleEndCompleted = async () => {
    if (!currentStakeID || !unstakeAmount || parseFloat(unstakeAmount) <= 0) return;
    
    try {
      const stakeIDBigInt = BigInt(currentStakeID);
      const amountBigInt = parseUnits(unstakeAmount, 8);
      await endCompletedStake(stakeIDBigInt, amountBigInt);
      setUnstakeAmount('');
      alert('Successfully unstaked TEAM!');
    } catch (error: any) {
      console.error('End stake error:', error);
      alert(error.message || 'Failed to unstake TEAM');
    }
  };

  const handleExtend = async () => {
    if (!currentStakeID) return;
    
    try {
      const stakeIDBigInt = BigInt(currentStakeID);
      await extendStake(stakeIDBigInt);
      alert('Successfully extended stake to next period!');
    } catch (error: any) {
      console.error('Extend error:', error);
      alert(error.message || 'Failed to extend stake');
    }
  };

  const handleRestake = async () => {
    if (!currentStakeID) return;
    
    try {
      const stakeIDBigInt = BigInt(currentStakeID);
      await restakeExpiredStake(stakeIDBigInt);
      alert('Successfully restaked for next period!');
    } catch (error: any) {
      console.error('Restake error:', error);
      alert(error.message || 'Failed to restake');
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-gray-400">Please connect your wallet to access TEAM staking</p>
        </div>
      </div>
    );
  }

  const completedPeriod = currentPeriod ? Number(currentPeriod) - 1 : 0;

  return (
    <>
      {/* Period Banner */}
      {!isStakingPeriod && currentPeriod && Number(currentPeriod) > 0 && (
        <div className="mb-6 p-4 bg-black border-2 border-white/30 rounded-xl">
          <p className="text-white font-semibold text-center">
            🎉 Period {completedPeriod} has ended! Rewards are available to claim below
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-black border-2 border-white/20 rounded-xl p-6">
          <h3 className="text-sm text-gray-300 mb-2">Your TEAM Balance</h3>
          <p className="text-3xl font-bold text-white">{formattedTeamBalance}</p>
          <p className="text-xs text-gray-400 mt-1">Available to stake</p>
        </div>
        
        <div className="bg-black border-2 border-white/20 rounded-xl p-6">
          <h3 className="text-sm text-gray-300 mb-2">Your Staked TEAM</h3>
          <p className="text-3xl font-bold text-white">{formattedUserStaked}</p>
          <p className="text-xs text-gray-400 mt-1">Currently locked</p>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="stake" className="w-full">
        <TabsList className="flex w-full justify-center bg-transparent rounded-none h-auto p-0 gap-0 mb-0">
          <TabsTrigger 
            value="stake" 
            className="text-base px-8 py-3 rounded-t-xl rounded-b-none bg-transparent border-2 border-transparent data-[state=active]:bg-black data-[state=active]:border-white/50 data-[state=active]:border-b-transparent data-[state=active]:text-white text-gray-500 hover:text-gray-300 transition-colors relative data-[state=active]:z-10"
          >
            Stake TEAM
          </TabsTrigger>
          <TabsTrigger 
            value="unstake" 
            className="text-base px-8 py-3 rounded-t-xl rounded-b-none bg-transparent border-2 border-transparent data-[state=active]:bg-black data-[state=active]:border-white/50 data-[state=active]:border-b-transparent data-[state=active]:text-white text-gray-500 hover:text-gray-300 transition-colors relative data-[state=active]:z-10"
          >
            Unstake TEAM
          </TabsTrigger>
          <TabsTrigger 
            value="rewards" 
            className="text-base px-8 py-3 rounded-t-xl rounded-b-none bg-transparent border-2 border-transparent data-[state=active]:bg-black data-[state=active]:border-white/50 data-[state=active]:border-b-transparent data-[state=active]:text-white text-gray-500 hover:text-gray-300 transition-colors relative data-[state=active]:z-10"
          >
            Claim Rewards
          </TabsTrigger>
        </TabsList>

        {/* Stake Tab */}
        <TabsContent value="stake" className="mt-0">
          <div className="border-2 border-white/50 rounded-b-xl rounded-tr-xl rounded-tl-xl p-8 bg-black -mt-0.5">
            <h2 className="text-3xl font-bold text-white mb-6">Stake TEAM to Earn Rewards</h2>
            
            <div className="space-y-4">
              <div>
                <input
                  ref={stakeAmountRef}
                  type="text"
                  value={formatNumberWithCommas(stakeAmount)}
                  onChange={(e) => handleAmountChange(e, setStakeAmount, stakeAmountRef)}
                  placeholder="0.00"
                  className="w-full bg-black border-2 border-white/20 rounded-lg p-4 text-white text-lg placeholder-gray-400 focus:outline-none focus:border-white"
                />
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-gray-400 text-sm">
                    Balance: {formattedTeamBalance} TEAM
                  </span>
                  <button
                    type="button"
                    onClick={() => setStakeAmount(fullPrecisionTeamBalance)}
                    className="text-white hover:text-gray-300 text-sm font-semibold uppercase"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <button
                onClick={handleStake}
                disabled={!stakeAmount || parseFloat(stakeAmount) <= 0 || isLoading || baseStakeIsActive === true}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                  stakeAmount && parseFloat(stakeAmount) > 0 && !isLoading && baseStakeIsActive !== true
                    ? 'bg-white/10 hover:bg-white/20 text-white'
                    : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Stake TEAM'
                )}
              </button>

              {/* Show warning if BASE stake is active */}
              {baseStakeIsActive === true && (
                <div className="flex items-center gap-3 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg outline-none select-none">
                  <Info className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <p className="text-sm text-center text-yellow-400">
                    Staking is only available after the BASE stake ends in:{' '}
                    <span className="font-mono font-semibold">
                      {stakeEndCountdown.days > 0 && `${stakeEndCountdown.days}d `}
                      {stakeEndCountdown.hours}h {stakeEndCountdown.minutes}m {stakeEndCountdown.seconds}s
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Unstake Tab */}
        <TabsContent value="unstake" className="mt-0">
          <div className="border-2 border-white/50 rounded-b-xl rounded-tr-xl rounded-tl-xl p-8 bg-black -mt-0.5">
            <h2 className="text-3xl font-bold text-white mb-6">Unstake TEAM</h2>
            
            <div className="space-y-4">
              <div>
                <input
                  ref={unstakeAmountRef}
                  type="text"
                  value={formatNumberWithCommas(unstakeAmount)}
                  onChange={(e) => handleAmountChange(e, setUnstakeAmount, unstakeAmountRef)}
                  placeholder="0.00"
                  className="w-full bg-black border-2 border-white/20 rounded-lg p-4 text-white text-lg placeholder-gray-400 focus:outline-none focus:border-white"
                />
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-gray-400 text-sm">
                    Staked: {formattedUserStaked} TEAM
                  </span>
                  <button
                    type="button"
                    onClick={() => setUnstakeAmount(fullPrecisionUserStaked)}
                    className="text-white hover:text-gray-300 text-sm font-semibold uppercase"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Show Early Unstake if BASE stake is active */}
              {baseStakeIsActive === undefined ? (
                <div className="p-4 bg-gray-700/30 border border-gray-600/30 rounded-lg">
                  <p className="text-sm text-gray-400 text-center">
                    <Loader2 className="w-4 h-4 inline animate-spin mr-2" />
                    Checking BASE stake status...
                  </p>
                </div>
              ) : baseStakeIsActive === true ? (
                <>
                  <button
                    onClick={handleEarlyEndStake}
                    disabled={!unstakeAmount || parseFloat(unstakeAmount) <= 0 || isLoading}
                    className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                      unstakeAmount && parseFloat(unstakeAmount) > 0 && !isLoading
                        ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border-2 border-red-500/50'
                        : 'bg-gray-700/50 text-gray-500 cursor-not-allowed border-2 border-gray-700/50'
                    }`}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      '⚠️ Early Unstake (3.69% Penalty)'
                    )}
                  </button>

                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg mt-4">
                    <p className="text-sm text-red-400 font-semibold">
                      ⚠️ BASE stake is still active. Early unstaking incurs a 3.69% penalty. Wait for the BASE stake to end to unstake without penalty.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={handleEndCompleted}
                    disabled={!unstakeAmount || parseFloat(unstakeAmount) <= 0 || isLoading}
                    className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                      unstakeAmount && parseFloat(unstakeAmount) > 0 && !isLoading
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      'Unstake TEAM'
                    )}
                  </button>

                  <div className="p-4 bg-white/5 border border-white/20 rounded-lg mt-4">
                    <p className="text-sm text-gray-300">
                      ✅ BASE stake has ended. You can now unstake without penalty.
                    </p>
                  </div>
                </>
              )}

              {/* Show Extend during reload phase (even periods) only */}
              {!isStakingPeriod && (
                <>
                  <button
                    onClick={handleExtend}
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl font-semibold bg-white/10 text-white hover:bg-white/20 disabled:bg-gray-700/50 disabled:text-gray-500 mt-4"
                  >
                    Extend Stake
                  </button>
                  <div className="p-4 bg-white/5 border border-white/20 rounded-lg mt-4">
                    <p className="text-sm text-gray-300">
                      <strong>Extend Stake:</strong> Roll your stake to the next period during the expiry window.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="mt-0">
          <RewardsClaimSection
            currentPeriod={completedPeriod}
            selectedClaimStakeID={selectedClaimStakeID}
            setSelectedClaimStakeID={setSelectedClaimStakeID}
            isLoading={isLoading}
            prepareClaim={prepareClaim}
            claimRewards={claimRewards}
            checkPrepareClaimStatus={checkPrepareClaimStatus}
            getClaimableAmount={getClaimableAmount}
            checkHasClaimed={checkHasClaimed}
            isStakingPeriod={isStakingPeriod}
            stakeEndCountdown={stakeEndCountdown}
          />
        </TabsContent>
      </Tabs>

      {/* Early Unstaking Warning Dialog */}
      <Dialog open={showEarlyUnstakeDialog} onOpenChange={setShowEarlyUnstakeDialog}>
        <DialogContent className="bg-black border-2 border-red-500/50 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400 text-2xl">
              <AlertTriangle className="w-6 h-6" />
              EARLY UNSTAKING WARNING
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">Unstaking Amount:</span>
                  <span className="text-white font-bold text-lg">{earlyUnstakeDetails.amount} TEAM</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-300 font-medium">Penalty (3.69%):</span>
                  <span className="text-red-400 font-bold text-lg">{earlyUnstakeDetails.penalty} TEAM</span>
                </div>
                <div className="h-px bg-red-500/30" />
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">You Will Receive:</span>
                  <span className="text-white font-bold text-xl">{earlyUnstakeDetails.afterPenalty} TEAM</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm text-center">
                Are you sure you want to continue?
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button 
              onClick={() => setShowEarlyUnstakeDialog(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white border-0"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmEarlyEndStake}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-2 border-red-500/50"
            >
              Confirm Unstake
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Rewards Claim Component
function RewardsClaimSection({
  currentPeriod,
  selectedClaimStakeID,
  setSelectedClaimStakeID,
  isLoading,
  prepareClaim,
  claimRewards,
  checkPrepareClaimStatus,
  getClaimableAmount,
  checkHasClaimed,
  isStakingPeriod,
  stakeEndCountdown,
}: any) {
  const [prepareStatuses, setPrepareStatuses] = useState<Record<string, boolean>>({});
  const [claimableAmounts, setClaimableAmounts] = useState<Record<string, bigint>>({});
  const [claimedStatuses, setClaimedStatuses] = useState<Record<string, boolean>>({});
  const [loadingToken, setLoadingToken] = useState<string | null>(null);

  useEffect(() => {
    if (currentPeriod && selectedClaimStakeID) {
      loadAllStatuses();
    }
  }, [currentPeriod, selectedClaimStakeID]);

  const loadAllStatuses = async () => {
    if (!currentPeriod) return;
    const period = BigInt(currentPeriod);
    const stakeID = BigInt(selectedClaimStakeID);
    
    const newPrepareStatuses: Record<string, boolean> = {};
    const newClaimableAmounts: Record<string, bigint> = {};
    const newClaimedStatuses: Record<string, boolean> = {};
    
    for (const token of REWARD_TOKENS) {
      const isPrepared = await checkPrepareClaimStatus(token, period);
      newPrepareStatuses[token] = isPrepared;
      
      if (isPrepared) {
        const { amount } = await getClaimableAmount(period, token, stakeID);
        newClaimableAmounts[token] = amount;
        
        const hasClaimed = await checkHasClaimed(period, token, stakeID);
        newClaimedStatuses[token] = hasClaimed;
      }
    }
    
    setPrepareStatuses(newPrepareStatuses);
    setClaimableAmounts(newClaimableAmounts);
    setClaimedStatuses(newClaimedStatuses);
  };

  const handlePrepareClaim = async (ticker: string) => {
    setLoadingToken(ticker);
    try {
      await prepareClaim(ticker);
      await loadAllStatuses();
      alert(`Successfully prepared ${ticker} rewards!`);
    } catch (error: any) {
      console.error('Prepare claim error:', error);
      alert(error.message || `Failed to prepare ${ticker} rewards`);
    } finally {
      setLoadingToken(null);
    }
  };

  const handleClaim = async (ticker: string) => {
    if (!currentPeriod) return;
    setLoadingToken(ticker);
    try {
      const period = BigInt(currentPeriod);
      const stakeID = BigInt(selectedClaimStakeID);
      await claimRewards(period, ticker, stakeID);
      await loadAllStatuses();
      alert(`Successfully claimed ${ticker} rewards!`);
    } catch (error: any) {
      console.error('Claim error:', error);
      alert(error.message || `Failed to claim ${ticker} rewards`);
    } finally {
      setLoadingToken(null);
    }
  };

  if (isStakingPeriod) {
    return (
      <div className="border-2 border-white/50 rounded-b-xl rounded-tr-xl rounded-tl-xl p-8 bg-black -mt-0.5">
        <div className="flex items-center justify-center gap-3 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg outline-none select-none">
          <Info className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <p className="text-sm text-yellow-400">
            Rewards can only be claimed once the BASE stake ends in:{' '}
            <span className="font-mono font-semibold">
              {stakeEndCountdown.days > 0 && `${stakeEndCountdown.days}d `}
              {stakeEndCountdown.hours}h {stakeEndCountdown.minutes}m {stakeEndCountdown.seconds}s
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-white/50 rounded-b-xl rounded-tr-xl rounded-tl-xl p-8 bg-black -mt-0.5">
      <h2 className="text-3xl font-bold text-white mb-4">
        Pending Rewards - Period {currentPeriod}
      </h2>
      <p className="text-gray-400 text-sm mb-6">
        Rewards earned during period {currentPeriod} are now available to claim
      </p>

      {/* Pending Rewards Summary */}
      {selectedClaimStakeID && Object.keys(claimableAmounts).length > 0 && (
        <div className="mb-6 p-5 bg-white/10 border-2 border-white/30 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-white">💎 Your Pending Rewards</h3>
            <span className="text-xs text-gray-400">Stake ID: {selectedClaimStakeID}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {REWARD_TOKENS.map((token) => {
              const amount = claimableAmounts[token] || 0n;
              const hasClaimed = claimedStatuses[token];
              if (amount === 0n && !hasClaimed) return null;
              return (
                <div key={token} className="flex items-center justify-between p-2 bg-black/50 rounded border border-white/10">
                  <span className="font-semibold text-gray-300">{token}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-white font-mono">
                      {amount > 0n ? parseFloat(formatUnits(amount, 8)).toFixed(2) : '0'}
                    </span>
                    {hasClaimed && <span className="text-green-400">✓</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
        
        {/* Stake ID Input */}
        <div className="mb-6">
          <label className="text-sm text-gray-300 mb-2 block">Your Stake ID:</label>
          <input
            type="number"
            value={selectedClaimStakeID}
            onChange={(e) => setSelectedClaimStakeID(e.target.value)}
            className="w-full bg-black border-2 border-white/20 rounded-lg p-3 text-white focus:outline-none focus:border-white"
            placeholder={currentPeriod.toString()}
          />
          <p className="text-xs text-gray-400 mt-1">
            Usually matches the period you staked in (e.g., Period {currentPeriod})
          </p>
        </div>
        
        {/* Prepare Claims */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            1️⃣ Prepare Claims (Anyone Can Call)
          </h3>
          <p className="text-sm text-gray-400 mb-3">
            Before claiming, someone must call prepareClaim for each token.
          </p>
          
          <div className="grid grid-cols-3 gap-2">
            {REWARD_TOKENS.map((token) => (
              <button
                key={token}
                onClick={() => handlePrepareClaim(token)}
                disabled={prepareStatuses[token] || loadingToken === token}
                className={`p-3 rounded-lg text-sm font-medium transition-all ${
                  prepareStatuses[token]
                    ? 'bg-white/10 text-white border border-white/30'
                    : 'bg-white/5 text-gray-400 border border-white/20 hover:bg-white/10 hover:text-white'
                }`}
              >
                {loadingToken === token ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  <>
                    {prepareStatuses[token] ? '✅' : '⚙️'} {token}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
        
        {/* Claim Rewards */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">
            2️⃣ Claim Your Rewards
          </h3>
          
          <div className="space-y-2">
            {REWARD_TOKENS.map((token) => {
              const amount = claimableAmounts[token] || 0n;
              const hasClaimed = claimedStatuses[token];
              const canClaim = prepareStatuses[token] && amount > 0n && !hasClaimed;
              
              return (
                <div
                  key={token}
                  className="flex items-center justify-between p-4 bg-black border-2 border-white/20 rounded-lg"
                >
                  <div>
                    <span className="font-semibold text-white text-lg">{token}</span>
                    <span className="text-sm text-gray-400 ml-3">
                      {amount > 0n ? formatUnits(amount, 8) : '0'}
                    </span>
                    {hasClaimed && (
                      <span className="ml-2 text-xs text-green-400">(Claimed ✓)</span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleClaim(token)}
                    disabled={!canClaim || loadingToken === token}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${
                      canClaim && !loadingToken
                        ? 'bg-white/10 text-white hover:bg-white/20'
                        : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {loadingToken === token ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : canClaim ? (
                      'Claim'
                    ) : hasClaimed ? (
                      'Claimed'
                    ) : (
                      'None'
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
    </div>
  );
}
