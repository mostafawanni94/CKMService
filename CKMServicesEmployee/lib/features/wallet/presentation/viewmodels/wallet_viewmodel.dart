/// Wallet ViewModel - MVVM Pattern
/// 
/// Handles wallet state and advance request logic.

import 'package:flutter/foundation.dart';
import '../../data/wallet_service.dart';

class WalletViewModel extends ChangeNotifier {
  final WalletService _service;

  WalletModel? _wallet;
  List<AdvanceRequestModel> _advances = [];
  bool _isLoading = false;
  String? _error;
  bool _advanceRequestSuccess = false;

  WalletViewModel({WalletService? service})
      : _service = service ?? WalletService();

  // Getters
  WalletModel? get wallet => _wallet;
  List<AdvanceRequestModel> get advances => _advances;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get advanceRequestSuccess => _advanceRequestSuccess;

  double get balance => _wallet?.balance ?? 0.0;
  double get totalEarnings => _wallet?.totalEarnings ?? 0.0;
  double get totalAdvances => _wallet?.totalAdvances ?? 0.0;

  /// Load wallet data
  Future<void> loadWallet() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _wallet = await _service.getMyWallet();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Load advance requests
  Future<void> loadAdvances() async {
    try {
      _advances = await _service.getMyAdvances();
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  /// Request advance (debt)
  Future<bool> requestAdvance({
    required double amount,
    required String reason,
  }) async {
    _isLoading = true;
    _error = null;
    _advanceRequestSuccess = false;
    notifyListeners();

    try {
      final advance = await _service.requestAdvance(
        amount: amount,
        reason: reason,
      );
      _advances.insert(0, advance);
      _advanceRequestSuccess = true;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Reset advance request success flag
  void resetAdvanceRequestFlag() {
    _advanceRequestSuccess = false;
    notifyListeners();
  }

  /// Clear error
  void clearError() {
    _error = null;
    notifyListeners();
  }
}
