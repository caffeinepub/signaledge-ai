import List "mo:core/List";
import Map "mo:core/Map";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  type Direction = { #buy; #sell };
  type Outcome = { #pending; #win; #loss };

  type Signal = {
    id : Nat;
    asset : Text;
    direction : Direction;
    confidence : Nat;
    expiryMinutes : Nat;
    timestamp : Time.Time;
    outcome : Outcome;
    rsi : Nat;
    stochasticK : Nat;
    stochasticD : Nat;
    macdValue : Float;
    macdSignalLine : Float;
  };

  module Signal {
    public func compare(signal1 : Signal, signal2 : Signal) : Order.Order {
      Nat.compare(signal1.id, signal2.id);
    };
  };

  type IndicatorConfig = {
    rsiPeriod : Nat;
    rsiOverbought : Nat;
    rsiOversold : Nat;
    stochasticKPeriod : Nat;
    stochasticDPeriod : Nat;
    stochasticOverbought : Nat;
    stochasticOversold : Nat;
    macdShortPeriod : Nat;
    macdLongPeriod : Nat;
    macdSignalPeriod : Nat;
    minConfidence : Nat;
    timeframe : Text;
  };

  type BacktestResult = {
    asset : Text;
    startDate : Time.Time;
    endDate : Time.Time;
    totalTrades : Nat;
    wins : Nat;
    losses : Nat;
    winRate : Nat;
    avgProfit : Float;
    maxDrawdown : Float;
  };

  public type UserProfile = {
    name : Text;
  };

  type Analytics = {
    totalSignals : Nat;
    winCount : Nat;
    lossCount : Nat;
    winRate : Nat;
    perAssetBreakdown : [(Text, AssetStats)];
  };

  type AssetStats = {
    totalSignals : Nat;
    wins : Nat;
    losses : Nat;
    winRate : Nat;
  };

  type DailyCount = {
    date : Text;
    count : Nat;
  };

  let signals = List.empty<Signal>();
  var nextSignalId = 1;

  var indicatorConfig : ?IndicatorConfig = null;
  let backtestResults = List.empty<BacktestResult>();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let userProfiles = Map.empty<Principal, UserProfile>();

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Signal Management
  public shared ({ caller }) func addSignal(
    asset : Text,
    direction : Direction,
    confidence : Nat,
    expiryMinutes : Nat,
    rsi : Nat,
    stochasticK : Nat,
    stochasticD : Nat,
    macdValue : Float,
    macdSignalLine : Float
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add signals");
    };
    let signal : Signal = {
      id = nextSignalId;
      asset;
      direction;
      confidence;
      expiryMinutes;
      timestamp = Time.now();
      outcome = #pending;
      rsi;
      stochasticK;
      stochasticD;
      macdValue;
      macdSignalLine;
    };

    signals.add(signal);
    nextSignalId += 1;
    signal.id;
  };

  public query ({ caller }) func getAllSignals() : async [Signal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view signals");
    };
    signals.toArray().sort();
  };

  public shared ({ caller }) func updateSignalOutcome(id : Nat, outcome : Outcome) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update signal outcomes");
    };
    let updatedSignals = signals.map<Signal, Signal>(
      func(s) {
        if (s.id == id) {
          {
            id = s.id;
            asset = s.asset;
            direction = s.direction;
            confidence = s.confidence;
            expiryMinutes = s.expiryMinutes;
            timestamp = s.timestamp;
            outcome;
            rsi = s.rsi;
            stochasticK = s.stochasticK;
            stochasticD = s.stochasticD;
            macdValue = s.macdValue;
            macdSignalLine = s.macdSignalLine;
          };
        } else {
          s;
        };
      }
    );
    signals.clear();
    signals.addAll(updatedSignals.values());
  };

  public query ({ caller }) func getSignalsByAsset(asset : Text) : async [Signal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view signals");
    };
    signals.toArray().sort().filter(
      func(s) { s.asset == asset }
    );
  };

  // Analytics
  public query ({ caller }) func getAnalytics() : async Analytics {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view analytics");
    };

    let allSignals = signals.toArray();
    let totalSignals = allSignals.size();
    var winCount = 0;
    var lossCount = 0;

    for (signal in allSignals.vals()) {
      switch (signal.outcome) {
        case (#win) { winCount += 1 };
        case (#loss) { lossCount += 1 };
        case (#pending) {};
      };
    };

    let winRate = if (winCount + lossCount > 0) {
      winCount * 100 / (winCount + lossCount);
    } else {
      0;
    };

    // Per-asset breakdown
    let assetMap = Map.empty<Text, AssetStats>();
    for (signal in allSignals.vals()) {
      let existing = assetMap.get(signal.asset);
      let stats = switch (existing) {
        case (?stats) {
          var wins = stats.wins;
          var losses = stats.losses;
          switch (signal.outcome) {
            case (#win) { wins += 1 };
            case (#loss) { losses += 1 };
            case (#pending) {};
          };
          let total = stats.totalSignals + 1;
          let rate = if (wins + losses > 0) {
            wins * 100 / (wins + losses);
          } else {
            0;
          };
          {
            totalSignals = total;
            wins;
            losses;
            winRate = rate;
          };
        };
        case null {
          var wins = 0;
          var losses = 0;
          switch (signal.outcome) {
            case (#win) { wins := 1 };
            case (#loss) { losses := 1 };
            case (#pending) {};
          };
          let rate = if (wins + losses > 0) {
            wins * 100 / (wins + losses);
          } else {
            0;
          };
          {
            totalSignals = 1;
            wins;
            losses;
            winRate = rate;
          };
        };
      };
      assetMap.add(signal.asset, stats);
    };

    {
      totalSignals;
      winCount;
      lossCount;
      winRate;
      perAssetBreakdown = assetMap.entries().toArray();
    };
  };

  public query ({ caller }) func getDailySignalCounts() : async [DailyCount] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view daily counts");
    };

    let allSignals = signals.toArray();
    let now = Time.now();
    let oneDayNanos = 24 * 60 * 60 * 1_000_000_000;

    let dailyCounts = List.empty<DailyCount>();

    var i = 0;
    while (i < 7) {
      let dayStart = now - ((i + 1) * oneDayNanos);
      let dayEnd = now - (i * oneDayNanos);
      var count = 0;

      for (signal in allSignals.vals()) {
        if (signal.timestamp >= dayStart and signal.timestamp < dayEnd) {
          count += 1;
        };
      };

      let daysAgo = 6 - i;
      dailyCounts.add({
        date = "Day -" # daysAgo.toText();
        count;
      });
      i += 1;
    };

    dailyCounts.toArray();
  };

  // Indicator Configuration
  public shared ({ caller }) func saveIndicatorConfig(config : IndicatorConfig) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save indicator configuration");
    };
    indicatorConfig := ?config;
  };

  public query ({ caller }) func getIndicatorConfig() : async ?IndicatorConfig {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view indicator configuration");
    };
    indicatorConfig;
  };

  // Backtesting
  public shared ({ caller }) func saveBacktestResult(result : BacktestResult) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save backtest results");
    };
    backtestResults.add(result);
  };

  public query ({ caller }) func getBacktestResults() : async [BacktestResult] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view backtest results");
    };
    backtestResults.toArray();
  };
};
