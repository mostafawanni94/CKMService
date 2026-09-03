import 'package:flutter/material.dart';
import '../../core/localization/app_strings.dart';

/// All countries with their flag emoji and name
const List<Map<String, String>> allCountries = [
  {'code': 'AF', 'name': 'Afghanistan', 'flag': '🇦🇫'},
  {'code': 'AL', 'name': 'Albania', 'flag': '🇦🇱'},
  {'code': 'DZ', 'name': 'Algeria', 'flag': '🇩🇿'},
  {'code': 'AD', 'name': 'Andorra', 'flag': '🇦🇩'},
  {'code': 'AO', 'name': 'Angola', 'flag': '🇦🇴'},
  {'code': 'AR', 'name': 'Argentina', 'flag': '🇦🇷'},
  {'code': 'AM', 'name': 'Armenia', 'flag': '🇦🇲'},
  {'code': 'AU', 'name': 'Australia', 'flag': '🇦🇺'},
  {'code': 'AT', 'name': 'Austria', 'flag': '🇦🇹'},
  {'code': 'AZ', 'name': 'Azerbaijan', 'flag': '🇦🇿'},
  {'code': 'BH', 'name': 'Bahrain', 'flag': '🇧🇭'},
  {'code': 'BD', 'name': 'Bangladesh', 'flag': '🇧🇩'},
  {'code': 'BY', 'name': 'Belarus', 'flag': '🇧🇾'},
  {'code': 'BE', 'name': 'Belgium', 'flag': '🇧🇪'},
  {'code': 'BZ', 'name': 'Belize', 'flag': '🇧🇿'},
  {'code': 'BJ', 'name': 'Benin', 'flag': '🇧🇯'},
  {'code': 'BT', 'name': 'Bhutan', 'flag': '🇧🇹'},
  {'code': 'BO', 'name': 'Bolivia', 'flag': '🇧🇴'},
  {'code': 'BA', 'name': 'Bosnia and Herzegovina', 'flag': '🇧🇦'},
  {'code': 'BW', 'name': 'Botswana', 'flag': '🇧🇼'},
  {'code': 'BR', 'name': 'Brazil', 'flag': '🇧🇷'},
  {'code': 'BN', 'name': 'Brunei', 'flag': '🇧🇳'},
  {'code': 'BG', 'name': 'Bulgaria', 'flag': '🇧🇬'},
  {'code': 'BF', 'name': 'Burkina Faso', 'flag': '🇧🇫'},
  {'code': 'BI', 'name': 'Burundi', 'flag': '🇧🇮'},
  {'code': 'KH', 'name': 'Cambodia', 'flag': '🇰🇭'},
  {'code': 'CM', 'name': 'Cameroon', 'flag': '🇨🇲'},
  {'code': 'CA', 'name': 'Canada', 'flag': '🇨🇦'},
  {'code': 'CV', 'name': 'Cape Verde', 'flag': '🇨🇻'},
  {'code': 'CF', 'name': 'Central African Republic', 'flag': '🇨🇫'},
  {'code': 'TD', 'name': 'Chad', 'flag': '🇹🇩'},
  {'code': 'CL', 'name': 'Chile', 'flag': '🇨🇱'},
  {'code': 'CN', 'name': 'China', 'flag': '🇨🇳'},
  {'code': 'CO', 'name': 'Colombia', 'flag': '🇨🇴'},
  {'code': 'KM', 'name': 'Comoros', 'flag': '🇰🇲'},
  {'code': 'CG', 'name': 'Congo', 'flag': '🇨🇬'},
  {'code': 'CR', 'name': 'Costa Rica', 'flag': '🇨🇷'},
  {'code': 'HR', 'name': 'Croatia', 'flag': '🇭🇷'},
  {'code': 'CU', 'name': 'Cuba', 'flag': '🇨🇺'},
  {'code': 'CY', 'name': 'Cyprus', 'flag': '🇨🇾'},
  {'code': 'CZ', 'name': 'Czech Republic', 'flag': '🇨🇿'},
  {'code': 'DK', 'name': 'Denmark', 'flag': '🇩🇰'},
  {'code': 'DJ', 'name': 'Djibouti', 'flag': '🇩🇯'},
  {'code': 'DM', 'name': 'Dominica', 'flag': '🇩🇲'},
  {'code': 'DO', 'name': 'Dominican Republic', 'flag': '🇩🇴'},
  {'code': 'EC', 'name': 'Ecuador', 'flag': '🇪🇨'},
  {'code': 'EG', 'name': 'Egypt', 'flag': '🇪🇬'},
  {'code': 'SV', 'name': 'El Salvador', 'flag': '🇸🇻'},
  {'code': 'GQ', 'name': 'Equatorial Guinea', 'flag': '🇬🇶'},
  {'code': 'ER', 'name': 'Eritrea', 'flag': '🇪🇷'},
  {'code': 'EE', 'name': 'Estonia', 'flag': '🇪🇪'},
  {'code': 'SZ', 'name': 'Eswatini', 'flag': '🇸🇿'},
  {'code': 'ET', 'name': 'Ethiopia', 'flag': '🇪🇹'},
  {'code': 'FJ', 'name': 'Fiji', 'flag': '🇫🇯'},
  {'code': 'FI', 'name': 'Finland', 'flag': '🇫🇮'},
  {'code': 'FR', 'name': 'France', 'flag': '🇫🇷'},
  {'code': 'GA', 'name': 'Gabon', 'flag': '🇬🇦'},
  {'code': 'GM', 'name': 'Gambia', 'flag': '🇬🇲'},
  {'code': 'GE', 'name': 'Georgia', 'flag': '🇬🇪'},
  {'code': 'DE', 'name': 'Germany', 'flag': '🇩🇪'},
  {'code': 'GH', 'name': 'Ghana', 'flag': '🇬🇭'},
  {'code': 'GR', 'name': 'Greece', 'flag': '🇬🇷'},
  {'code': 'GT', 'name': 'Guatemala', 'flag': '🇬🇹'},
  {'code': 'GN', 'name': 'Guinea', 'flag': '🇬🇳'},
  {'code': 'GW', 'name': 'Guinea-Bissau', 'flag': '🇬🇼'},
  {'code': 'GY', 'name': 'Guyana', 'flag': '🇬🇾'},
  {'code': 'HT', 'name': 'Haiti', 'flag': '🇭🇹'},
  {'code': 'HN', 'name': 'Honduras', 'flag': '🇭🇳'},
  {'code': 'HU', 'name': 'Hungary', 'flag': '🇭🇺'},
  {'code': 'IS', 'name': 'Iceland', 'flag': '🇮🇸'},
  {'code': 'IN', 'name': 'India', 'flag': '🇮🇳'},
  {'code': 'ID', 'name': 'Indonesia', 'flag': '🇮🇩'},
  {'code': 'IR', 'name': 'Iran', 'flag': '🇮🇷'},
  {'code': 'IQ', 'name': 'Iraq', 'flag': '🇮🇶'},
  {'code': 'IE', 'name': 'Ireland', 'flag': '🇮🇪'},
  {'code': 'IL', 'name': 'Israel', 'flag': '🇮🇱'},
  {'code': 'IT', 'name': 'Italy', 'flag': '🇮🇹'},
  {'code': 'CI', 'name': 'Ivory Coast', 'flag': '🇨🇮'},
  {'code': 'JM', 'name': 'Jamaica', 'flag': '🇯🇲'},
  {'code': 'JP', 'name': 'Japan', 'flag': '🇯🇵'},
  {'code': 'JO', 'name': 'Jordan', 'flag': '🇯🇴'},
  {'code': 'KZ', 'name': 'Kazakhstan', 'flag': '🇰🇿'},
  {'code': 'KE', 'name': 'Kenya', 'flag': '🇰🇪'},
  {'code': 'KI', 'name': 'Kiribati', 'flag': '🇰🇮'},
  {'code': 'KP', 'name': 'North Korea', 'flag': '🇰🇵'},
  {'code': 'KR', 'name': 'South Korea', 'flag': '🇰🇷'},
  {'code': 'KW', 'name': 'Kuwait', 'flag': '🇰🇼'},
  {'code': 'KG', 'name': 'Kyrgyzstan', 'flag': '🇰🇬'},
  {'code': 'LA', 'name': 'Laos', 'flag': '🇱🇦'},
  {'code': 'LV', 'name': 'Latvia', 'flag': '🇱🇻'},
  {'code': 'LB', 'name': 'Lebanon', 'flag': '🇱🇧'},
  {'code': 'LS', 'name': 'Lesotho', 'flag': '🇱🇸'},
  {'code': 'LR', 'name': 'Liberia', 'flag': '🇱🇷'},
  {'code': 'LY', 'name': 'Libya', 'flag': '🇱🇾'},
  {'code': 'LI', 'name': 'Liechtenstein', 'flag': '🇱🇮'},
  {'code': 'LT', 'name': 'Lithuania', 'flag': '🇱🇹'},
  {'code': 'LU', 'name': 'Luxembourg', 'flag': '🇱🇺'},
  {'code': 'MG', 'name': 'Madagascar', 'flag': '🇲🇬'},
  {'code': 'MW', 'name': 'Malawi', 'flag': '🇲🇼'},
  {'code': 'MY', 'name': 'Malaysia', 'flag': '🇲🇾'},
  {'code': 'MV', 'name': 'Maldives', 'flag': '🇲🇻'},
  {'code': 'ML', 'name': 'Mali', 'flag': '🇲🇱'},
  {'code': 'MT', 'name': 'Malta', 'flag': '🇲🇹'},
  {'code': 'MR', 'name': 'Mauritania', 'flag': '🇲🇷'},
  {'code': 'MU', 'name': 'Mauritius', 'flag': '🇲🇺'},
  {'code': 'MX', 'name': 'Mexico', 'flag': '🇲🇽'},
  {'code': 'MD', 'name': 'Moldova', 'flag': '🇲🇩'},
  {'code': 'MC', 'name': 'Monaco', 'flag': '🇲🇨'},
  {'code': 'MN', 'name': 'Mongolia', 'flag': '🇲🇳'},
  {'code': 'ME', 'name': 'Montenegro', 'flag': '🇲🇪'},
  {'code': 'MA', 'name': 'Morocco', 'flag': '🇲🇦'},
  {'code': 'MZ', 'name': 'Mozambique', 'flag': '🇲🇿'},
  {'code': 'MM', 'name': 'Myanmar', 'flag': '🇲🇲'},
  {'code': 'NA', 'name': 'Namibia', 'flag': '🇳🇦'},
  {'code': 'NR', 'name': 'Nauru', 'flag': '🇳🇷'},
  {'code': 'NP', 'name': 'Nepal', 'flag': '🇳🇵'},
  {'code': 'NL', 'name': 'Netherlands', 'flag': '🇳🇱'},
  {'code': 'NZ', 'name': 'New Zealand', 'flag': '🇳🇿'},
  {'code': 'NI', 'name': 'Nicaragua', 'flag': '🇳🇮'},
  {'code': 'NE', 'name': 'Niger', 'flag': '🇳🇪'},
  {'code': 'NG', 'name': 'Nigeria', 'flag': '🇳🇬'},
  {'code': 'MK', 'name': 'North Macedonia', 'flag': '🇲🇰'},
  {'code': 'NO', 'name': 'Norway', 'flag': '🇳🇴'},
  {'code': 'OM', 'name': 'Oman', 'flag': '🇴🇲'},
  {'code': 'PK', 'name': 'Pakistan', 'flag': '🇵🇰'},
  {'code': 'PS', 'name': 'Palestine', 'flag': '🇵🇸'},
  {'code': 'PA', 'name': 'Panama', 'flag': '🇵🇦'},
  {'code': 'PG', 'name': 'Papua New Guinea', 'flag': '🇵🇬'},
  {'code': 'PY', 'name': 'Paraguay', 'flag': '🇵🇾'},
  {'code': 'PE', 'name': 'Peru', 'flag': '🇵🇪'},
  {'code': 'PH', 'name': 'Philippines', 'flag': '🇵🇭'},
  {'code': 'PL', 'name': 'Poland', 'flag': '🇵🇱'},
  {'code': 'PT', 'name': 'Portugal', 'flag': '🇵🇹'},
  {'code': 'QA', 'name': 'Qatar', 'flag': '🇶🇦'},
  {'code': 'RO', 'name': 'Romania', 'flag': '🇷🇴'},
  {'code': 'RU', 'name': 'Russia', 'flag': '🇷🇺'},
  {'code': 'RW', 'name': 'Rwanda', 'flag': '🇷🇼'},
  {'code': 'SA', 'name': 'Saudi Arabia', 'flag': '🇸🇦'},
  {'code': 'SN', 'name': 'Senegal', 'flag': '🇸🇳'},
  {'code': 'RS', 'name': 'Serbia', 'flag': '🇷🇸'},
  {'code': 'SC', 'name': 'Seychelles', 'flag': '🇸🇨'},
  {'code': 'SL', 'name': 'Sierra Leone', 'flag': '🇸🇱'},
  {'code': 'SG', 'name': 'Singapore', 'flag': '🇸🇬'},
  {'code': 'SK', 'name': 'Slovakia', 'flag': '🇸🇰'},
  {'code': 'SI', 'name': 'Slovenia', 'flag': '🇸🇮'},
  {'code': 'SO', 'name': 'Somalia', 'flag': '🇸🇴'},
  {'code': 'ZA', 'name': 'South Africa', 'flag': '🇿🇦'},
  {'code': 'SS', 'name': 'South Sudan', 'flag': '🇸🇸'},
  {'code': 'ES', 'name': 'Spain', 'flag': '🇪🇸'},
  {'code': 'LK', 'name': 'Sri Lanka', 'flag': '🇱🇰'},
  {'code': 'SD', 'name': 'Sudan', 'flag': '🇸🇩'},
  {'code': 'SR', 'name': 'Suriname', 'flag': '🇸🇷'},
  {'code': 'SE', 'name': 'Sweden', 'flag': '🇸🇪'},
  {'code': 'CH', 'name': 'Switzerland', 'flag': '🇨🇭'},
  {'code': 'SY', 'name': 'Syria', 'flag': '🇸🇾'},
  {'code': 'TW', 'name': 'Taiwan', 'flag': '🇹🇼'},
  {'code': 'TJ', 'name': 'Tajikistan', 'flag': '🇹🇯'},
  {'code': 'TZ', 'name': 'Tanzania', 'flag': '🇹🇿'},
  {'code': 'TH', 'name': 'Thailand', 'flag': '🇹🇭'},
  {'code': 'TL', 'name': 'Timor-Leste', 'flag': '🇹🇱'},
  {'code': 'TG', 'name': 'Togo', 'flag': '🇹🇬'},
  {'code': 'TO', 'name': 'Tonga', 'flag': '🇹🇴'},
  {'code': 'TT', 'name': 'Trinidad and Tobago', 'flag': '🇹🇹'},
  {'code': 'TN', 'name': 'Tunisia', 'flag': '🇹🇳'},
  {'code': 'TR', 'name': 'Turkey', 'flag': '🇹🇷'},
  {'code': 'TM', 'name': 'Turkmenistan', 'flag': '🇹🇲'},
  {'code': 'TV', 'name': 'Tuvalu', 'flag': '🇹🇻'},
  {'code': 'UG', 'name': 'Uganda', 'flag': '🇺🇬'},
  {'code': 'UA', 'name': 'Ukraine', 'flag': '🇺🇦'},
  {'code': 'AE', 'name': 'United Arab Emirates', 'flag': '🇦🇪'},
  {'code': 'GB', 'name': 'United Kingdom', 'flag': '🇬🇧'},
  {'code': 'US', 'name': 'United States', 'flag': '🇺🇸'},
  {'code': 'UY', 'name': 'Uruguay', 'flag': '🇺🇾'},
  {'code': 'UZ', 'name': 'Uzbekistan', 'flag': '🇺🇿'},
  {'code': 'VU', 'name': 'Vanuatu', 'flag': '🇻🇺'},
  {'code': 'VE', 'name': 'Venezuela', 'flag': '🇻🇪'},
  {'code': 'VN', 'name': 'Vietnam', 'flag': '🇻🇳'},
  {'code': 'YE', 'name': 'Yemen', 'flag': '🇾🇪'},
  {'code': 'ZM', 'name': 'Zambia', 'flag': '🇿🇲'},
  {'code': 'ZW', 'name': 'Zimbabwe', 'flag': '🇿🇼'},
];

/// Beautiful searchable country picker with flags
class CountryPickerField extends StatelessWidget {
  final String label;
  final String? value;
  final Function(String) onChanged;
  final bool required;

  const CountryPickerField({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    this.required = false,
  });

  @override
  Widget build(BuildContext context) {
    // Find selected country
    final selected = allCountries.firstWhere(
      (c) => c['name'] == value,
      orElse: () => {'name': '', 'flag': '🌍', 'code': ''},
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          required ? '$label *' : label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: Color(0xFF374151),
          ),
        ),
        const SizedBox(height: 8),
        InkWell(
          onTap: () => _showCountryPicker(context),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Row(
              children: [
                Text(
                  selected['flag']!,
                  style: const TextStyle(fontSize: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    value ?? 'Select country',
                    style: TextStyle(
                      fontSize: 15,
                      color: value != null ? Colors.grey.shade800 : Colors.grey.shade400,
                    ),
                  ),
                ),
                Icon(Icons.keyboard_arrow_down_rounded, color: Colors.grey.shade400),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _showCountryPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _CountryPickerSheet(
        selectedCountry: value,
        onSelected: (country) {
          onChanged(country);
          Navigator.pop(context);
        },
      ),
    );
  }
}

class _CountryPickerSheet extends StatefulWidget {
  final String? selectedCountry;
  final Function(String) onSelected;

  const _CountryPickerSheet({
    required this.selectedCountry,
    required this.onSelected,
  });

  @override
  State<_CountryPickerSheet> createState() => _CountryPickerSheetState();
}

class _CountryPickerSheetState extends State<_CountryPickerSheet> {
  final _searchController = TextEditingController();
  List<Map<String, String>> _filteredCountries = allCountries;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _filterCountries(String query) {
    setState(() {
      if (query.isEmpty) {
        _filteredCountries = allCountries;
      } else {
        _filteredCountries = allCountries
            .where((c) => c['name']!.toLowerCase().contains(query.toLowerCase()))
            .toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          // Header
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Text(
                  context.strings.selectNationality,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1E3A5F),
                  ),
                ),
                const SizedBox(height: 16),
                // Search field
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.search, color: Colors.grey.shade500, size: 22),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _searchController,
                          onChanged: _filterCountries,
                          decoration: InputDecoration(
                            hintText: context.strings.searchCountries,
                            hintStyle: TextStyle(color: Colors.grey.shade500),
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      ),
                      if (_searchController.text.isNotEmpty)
                        GestureDetector(
                          onTap: () {
                            _searchController.clear();
                            _filterCountries('');
                          },
                          child: Icon(Icons.close, color: Colors.grey.shade500, size: 20),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Country list
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: _filteredCountries.length,
              itemBuilder: (context, index) {
                final country = _filteredCountries[index];
                final isSelected = country['name'] == widget.selectedCountry;
                return Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => widget.onSelected(country['name']!),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFF1E3A5F).withValues(alpha: 0.1) : null,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Text(country['flag']!, style: const TextStyle(fontSize: 26)),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Text(
                              country['name']!,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                                color: isSelected ? const Color(0xFF1E3A5F) : Colors.grey.shade800,
                              ),
                            ),
                          ),
                          if (isSelected)
                            const Icon(Icons.check_circle, color: Color(0xFF1E3A5F), size: 22),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
