/// Wallet Service - API Calls for Wallet
/// 
/// Handles wallet, transactions, and advance requests.

import '../../../core/network/api_client.dart';

/// Wallet Model
class WalletModel {
  final String id;
  final double balance;
  final double totalEarnings;
  final double totalAdvances;
  final List<TransactionModel> recentTransactions;

  WalletModel({
    required this.id,
    required this.balance,
    required this.totalEarnings,
    required this.totalAdvances,
    required this.recentTransactions,
  });

  factory WalletModel.fromJson(Map<String, dynamic> json) {
    return WalletModel(
      id: json['id'],
      balance: double.tryParse(json['balance'].toString()) ?? 0.0,
      totalEarnings: double.tryParse(json['total_earnings'].toString()) ?? 0.0,
      totalAdvances: double.tryParse(json['total_advances'].toString()) ?? 0.0,
      recentTransactions: (json['recent_transactions'] as List? ?? [])
          .map((t) => TransactionModel.fromJson(t))
          .toList(),
    );
  }
}

/// Transaction Model
class TransactionModel {
  final String id;
  final String type;
  final double amount;
  final String description;
  final String status;
  final DateTime createdAt;

  TransactionModel({
    required this.id,
    required this.type,
    required this.amount,
    required this.description,
    required this.status,
    required this.createdAt,
  });

  factory TransactionModel.fromJson(Map<String, dynamic> json) {
    return TransactionModel(
      id: json['id'],
      type: json['transaction_type'] ?? '',
      amount: double.tryParse(json['amount'].toString()) ?? 0.0,
      description: json['description'] ?? '',
      status: json['status'] ?? '',
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
    );
  }

  bool get isPositive => amount >= 0;
}

/// Advance Request Model
class AdvanceRequestModel {
  final String id;
  final double amount;
  final String reason;
  final String status;
  final DateTime createdAt;

  AdvanceRequestModel({
    required this.id,
    required this.amount,
    required this.reason,
    required this.status,
    required this.createdAt,
  });

  factory AdvanceRequestModel.fromJson(Map<String, dynamic> json) {
    return AdvanceRequestModel(
      id: json['id'],
      amount: double.tryParse(json['amount'].toString()) ?? 0.0,
      reason: json['reason'] ?? '',
      status: json['status'] ?? 'pending',
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
    );
  }
}

/// Wallet Service
class WalletService {
  final ApiClient _api;

  WalletService({ApiClient? api}) : _api = api ?? ApiClient();

  /// Get current user's wallet
  Future<WalletModel> getMyWallet() async {
    final response = await _api.get('/wallet/wallets/my_wallet/');
    return WalletModel.fromJson(response);
  }

  /// Get advance requests
  Future<List<AdvanceRequestModel>> getMyAdvances() async {
    final response = await _api.get('/wallet/advances/');
    final results = response['results'] as List? ?? [];
    return results.map((a) => AdvanceRequestModel.fromJson(a)).toList();
  }

  /// Request advance (debt)
  Future<AdvanceRequestModel> requestAdvance({
    required double amount,
    required String reason,
  }) async {
    final response = await _api.post('/wallet/advances/', body: {
      'amount': amount.toString(),
      'reason': reason,
    });
    return AdvanceRequestModel.fromJson(response);
  }
}
