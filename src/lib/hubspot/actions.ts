// src/lib/hubspot/actions.ts
import { ActionConfig } from '../services';

export const HUBSPOT_ACTIONS: Record<string, ActionConfig> = {
  COMPANY_READER: {
    id: 'COMPANY_READER',
    name: 'HubSpot Company Reader',
    description: 'Load in Company data from a HubSpot CRM. Outputs can include Company names, phone numbers, assigned owners, industry, country, etc.',
    configFields: [
      {
        name: 'properties',
        label: 'Company Properties',
        type: 'multiselect',
        required: true,
        options: [
          { value: 'about_us', label: 'About Us' },
          { value: 'hs_additional_domains', label: 'Additional Domains' },
          { value: 'hs_all_owner_ids', label: 'All owner IDs' },
          { value: 'hs_all_team_ids', label: 'All team IDs' },
          { value: 'hs_all_accessible_team_ids', label: 'All teams' },
          { value: 'annualrevenue', label: 'Annual Revenue' },
          { value: 'hs_annual_revenue_currency_code', label: 'Annual Revenue Currency Code' },
          { value: 'hs_avatar_filemanager_key', label: 'Avatar FileManager key' },
          { value: 'hs_all_assigned_business_unit_ids', label: 'Business units' },
          { value: 'engagements_last_meeting_booked_campaign', label: 'Campaign of last booking in meetings tool' },
          { value: 'city', label: 'City' },
          { value: 'closedate', label: 'Close Date' },
          { value: 'domain', label: 'Company Domain Name' },
          { value: 'hs_keywords', label: 'Company Keywords' },
          { value: 'name', label: 'Company name' },
          { value: 'hubspot_owner_id', label: 'Company owner' },
          { value: 'hs_task_label', label: 'Company task label' },
          { value: 'country', label: 'Country/Region' },
          { value: 'hs_country_code', label: 'Country/Region Code' },
          { value: 'createdate', label: 'Create Date' },
          { value: 'hs_created_by_user_id', label: 'Created by user ID' },
          { value: 'hs_csm_sentiment', label: 'CSM Sentiment' },
          { value: 'hs_date_entered_customer', label: "Date entered 'Customer (Lifecycle Stage Pipeline)'" },
          { value: 'hs_date_entered_evangelist', label: "Date entered 'Evangelist (Lifecycle Stage Pipeline)'" },
          { value: 'hs_date_entered_lead', label: "Date entered 'Lead (Lifecycle Stage Pipeline)'" },
          { value: 'hs_date_entered_marketingqualifiedlead', label: "Date entered 'Marketing Qualified Lead (Lifecycle Stage Pipeline)'" },
          { value: 'hs_date_entered_opportunity', label: "Date entered 'Opportunity (Lifecycle Stage Pipeline)'" },
          { value: 'hs_date_entered_other', label: "Date entered 'Other (Lifecycle Stage Pipeline)'" },
          { value: 'hs_date_entered_salesqualifiedlead', label: "Date entered 'Sales Qualified Lead (Lifecycle Stage Pipeline)'" },
          { value: 'hs_date_entered_subscriber', label: "Date entered 'Subscriber (Lifecycle Stage Pipeline)'" },
          { value: 'hs_date_exited_customer', label: "Date exited 'Customer (Lifecycle Stage Pipeline)'" },
          { value: 'hs_date_exited_evangelist', label: "Date exited 'Evangelist (Lifecycle Stage Pipeline)'" },
          { value: 'hs_date_exited_lead', label: "Date exited 'Lead (Lifecycle Stage Pipeline)'" },
          { value: 'hs_date_exited_marketingqualifiedlead', label: "Date exited 'Marketing Qualified Lead (Lifecycle Stage Pipeline)'" },
          { value: 'hs_date_exited_opportunity', label: "Date exited 'Opportunity (Lifecycle Stage Pipeline)'" },
          { value: 'hs_date_exited_other', label: "Date exited 'Other (Lifecycle Stage Pipeline)'" },
          { value: 'hs_date_exited_salesqualifiedlead', label: "Date exited 'Sales Qualified Lead (Lifecycle Stage Pipeline)'" },
          { value: 'hs_date_exited_subscriber', label: "Date exited 'Subscriber (Lifecycle Stage Pipeline)'" },
          { value: 'engagements_last_meeting_booked', label: 'Date of last meeting booked in meetings tool' },
          { value: 'days_to_close', label: 'Days to Close' },
          { value: 'description', label: 'Description' },
          { value: 'hs_employee_range', label: 'Employee range' },
          { value: 'facebook_company_page', label: 'Facebook Company Page' },
          { value: 'facebookfans', label: 'Facebook Fans' },
          { value: 'first_contact_createdate', label: 'First Contact Create Date' },
          { value: 'first_conversion_event_name', label: 'First Conversion' },
          { value: 'first_conversion_date', label: 'First Conversion Date' },
          { value: 'first_deal_created_date', label: 'First Deal Created Date' },
          { value: 'hs_analytics_first_touch_converting_campaign', label: 'First Touch Converting Campaign' },
          { value: 'founded_year', label: 'Year Founded' },
          { value: 'googleplus_page', label: 'Google Plus Page' },
          { value: 'hs_is_enriched', label: 'Has been enriched' },
          { value: 'owneremail', label: 'HubSpot Owner Email' },
          { value: 'ownername', label: 'HubSpot Owner Name' },
          { value: 'hubspotscore', label: 'HubSpot Score' },
          { value: 'hubspot_team_id', label: 'HubSpot Team' },
          { value: 'hs_ideal_customer_profile', label: 'Ideal Customer Profile Tier' },
          { value: 'industry', label: 'Industry' },
          { value: 'hs_industry_group', label: 'Industry group' },
          { value: 'is_public', label: 'Is Public' },
          { value: 'hs_notes_last_activity', label: 'Last Activity' },
          { value: 'notes_last_updated', label: 'Last Activity Date' },
          { value: 'hs_last_booked_meeting_date', label: 'Last Booked Meeting Date' },
          { value: 'notes_last_contacted', label: 'Last Contacted' },
          { value: 'hs_last_sales_activity_timestamp', label: 'Last Engagement Date' },
          { value: 'hs_last_sales_activity_type', label: 'Last Engagement Type' },
          { value: 'hs_last_logged_call_date', label: 'Last Logged Call Date' },
          { value: 'hs_last_logged_outgoing_email_date', label: 'Last Logged Outgoing Email Date' },
          { value: 'hs_last_metered_enrichment_timestamp', label: 'Last Metered Enrichment Timestamp' },
          { value: 'hs_lastmodifieddate', label: 'Last Modified Date' },
          { value: 'hs_last_open_task_date', label: 'Last Open Task Date' },
          { value: 'hs_analytics_last_touch_converting_campaign', label: 'Last Touch Converting Campaign' },
          { value: 'hs_analytics_latest_source', label: 'Latest Traffic Source' },
          { value: 'hs_analytics_latest_source_data_1', label: 'Latest Traffic Source Data 1' },
          { value: 'hs_analytics_latest_source_data_2', label: 'Latest Traffic Source Data 2' },
          { value: 'hs_analytics_latest_source_timestamp', label: 'Latest Traffic Source Timestamp' },
          { value: 'hs_latest_createdate_of_active_subscriptions', label: 'Latest create date of active subscriptions' },
          { value: 'hs_latest_meeting_activity', label: 'Latest meeting activity' },
          { value: 'hs_lead_status', label: 'Lead Status' },
          { value: 'lifecyclestage', label: 'Lifecycle Stage' },
          { value: 'hs_predictivecontactscore_v2', label: 'Likelihood to close' },
          { value: 'linkedinbio', label: 'LinkedIn Bio' },
          { value: 'linkedin_company_page', label: 'LinkedIn Company Page' },
          { value: 'hs_linkedin_handle', label: 'Linkedin handle' },
          { value: 'hs_logo_url', label: 'Logo URL' },
          { value: 'engagements_last_meeting_booked_medium', label: 'Medium of last booking in meetings tool' },
          { value: 'hs_merged_object_ids', label: 'Merged Company IDs' },
          { value: 'hs_notes_next_activity', label: 'Next Activity' },
          { value: 'notes_next_activity_date', label: 'Next Activity Date' },
          { value: 'hs_notes_next_activity_type', label: 'Next Activity Type' },
          { value: 'num_associated_contacts', label: 'Number of Associated Contacts' },
          { value: 'num_associated_deals', label: 'Number of Associated Deals' },
          { value: 'num_conversion_events', label: 'Number of Form Submissions' },
          { value: 'hs_analytics_num_page_views', label: 'Number of Pageviews' },
          { value: 'num_notes', label: 'Number of Sales Activities' },
          { value: 'hs_analytics_num_visits', label: 'Number of Sessions' },
          { value: 'hs_num_blockers', label: 'Number of blockers' },
          { value: 'hs_num_child_companies', label: 'Number of child companies' },
          { value: 'hs_num_contacts_with_buying_roles', label: 'Number of contacts with a buying role' },
          { value: 'hs_num_decision_makers', label: 'Number of decision makers' },
          { value: 'numberofemployees', label: 'Number of Employees' },
          { value: 'hs_num_open_deals', label: 'Number of open deals' },
          { value: 'num_contacted_notes', label: 'Number of times contacted' },
          { value: 'hs_createdate', label: 'Object create date/time' },
          { value: 'hs_analytics_source', label: 'Original Traffic Source' },
          { value: 'hs_analytics_source_data_1', label: 'Original Traffic Source Drill-Down 1' },
          { value: 'hs_analytics_source_data_2', label: 'Original Traffic Source Drill-Down 2' },
          { value: 'hubspot_owner_assigneddate', label: 'Owner assigned date' },
          { value: 'hs_parent_company_id', label: 'Parent Company' },
          { value: 'hs_was_imported', label: 'Performed in an import' },
          { value: 'phone', label: 'Phone Number' },
          { value: 'hs_pinned_engagement_id', label: 'Pinned Engagement ID' },
          { value: 'hs_pipeline', label: 'Pipeline' },
          { value: 'zip', label: 'Postal Code' },
          { value: 'hs_quick_context', label: 'Quick context' },
          { value: 'hs_read_only', label: 'Read only object' },
          { value: 'recent_conversion_event_name', label: 'Recent Conversion' },
          { value: 'recent_conversion_date', label: 'Recent Conversion Date' },
          { value: 'recent_deal_amount', label: 'Recent Deal Amount' },
          { value: 'recent_deal_close_date', label: 'Recent Deal Close Date' },
          { value: 'hs_sales_email_last_replied', label: 'Recent Sales Email Replied Date' },
          { value: 'hs_customer_success_ticket_sentiment', label: 'Recent Ticket Sentiment' },
          { value: 'hs_object_id', label: 'Record ID' },
          { value: 'hs_object_source', label: 'Record creation source' },
          { value: 'hs_object_source_id', label: 'Record creation source ID' },
          { value: 'hs_object_source_user_id', label: 'Record creation source user ID' },
          { value: 'hs_object_source_label', label: 'Record source' },
          { value: 'hs_object_source_detail_1', label: 'Record source detail 1' },
          { value: 'hs_object_source_detail_2', label: 'Record source detail 2' },
          { value: 'hs_object_source_detail_3', label: 'Record source detail 3' },
          { value: 'hs_revenue_range', label: 'Revenue range' },
          { value: 'hs_shared_team_ids', label: 'Shared teams' },
          { value: 'hs_shared_user_ids', label: 'Shared users' },
          { value: 'engagements_last_meeting_booked_source', label: 'Source of last booking in meetings tool' },
          { value: 'hs_source_object_id', label: 'Source Object ID' },
          { value: 'state', label: 'State/Region' },
          { value: 'address', label: 'Street Address' },
          { value: 'address2', label: 'Street Address 2' },
          { value: 'hs_target_account', label: 'Target Account' },
          { value: 'hs_target_account_probability', label: 'Target Account Probability' },
          { value: 'hs_target_account_recommendation_snooze_time', label: 'Target Account Recommendation Snooze Time' },
          { value: 'hs_target_account_recommendation_state', label: 'Target Account Recommendation State' },
          { value: 'hs_analytics_first_timestamp', label: 'Time First Seen' },
          { value: 'hs_analytics_last_timestamp', label: 'Time Last Seen' },
          { value: 'timezone', label: 'Time Zone' },
          { value: 'hs_time_in_customer', label: "Time in 'Customer (Lifecycle Stage Pipeline)'" },
          { value: 'hs_time_in_evangelist', label: "Time in 'Evangelist (Lifecycle Stage Pipeline)'" },
          { value: 'hs_time_in_lead', label: "Time in 'Lead (Lifecycle Stage Pipeline)'" },
          { value: 'hs_time_in_marketingqualifiedlead', label: "Time in 'Marketing Qualified Lead (Lifecycle Stage Pipeline)'" },
          { value: 'hs_time_in_opportunity', label: "Time in 'Opportunity (Lifecycle Stage Pipeline)'" },
          { value: 'hs_time_in_other', label: "Time in 'Other (Lifecycle Stage Pipeline)'" },
          { value: 'hs_time_in_salesqualifiedlead', label: "Time in 'Sales Qualified Lead (Lifecycle Stage Pipeline)'" },
          { value: 'hs_time_in_subscriber', label: "Time in 'Subscriber (Lifecycle Stage Pipeline)'" },
          { value: 'hs_analytics_first_visit_timestamp', label: 'Time of First Session' },
          { value: 'hs_analytics_last_visit_timestamp', label: 'Time of Last Session' },
          { value: 'total_money_raised', label: 'Total Money Raised' },
          { value: 'total_revenue', label: 'Total Revenue' },
          { value: 'hs_total_deal_value', label: 'Total open deal value' },
          { value: 'twitterbio', label: 'Twitter Bio' },
          { value: 'twitterfollowers', label: 'Twitter Followers' },
          { value: 'twitterhandle', label: 'Twitter Handle' },
          { value: 'type', label: 'Type' },
          { value: 'hs_unique_creation_key', label: 'Unique creation key' },
          { value: 'hs_updated_by_user_id', label: 'Updated by user ID' },
          { value: 'hs_user_ids_of_all_notification_followers', label: 'User IDs of all notification followers' },
          { value: 'hs_user_ids_of_all_notification_unfollowers', label: 'User IDs of all notification unfollowers' },
          { value: 'hs_user_ids_of_all_owners', label: 'User IDs of all owners' },
          { value: 'web_technologies', label: 'Web Technologies' },
          { value: 'website', label: 'Website URL' }
        ],
        placeholder: 'Select company properties to fetch'
      },
      {
        name: 'limit',
        label: 'Number of Companies',
        type: 'number',
        required: false,
        placeholder: '[Optional] 5'
      }
    ],
    ports: {
      inputs: [],
      outputs: [
        // Default output port for companies array
        // { id: 'output_companies', label: 'Companies', type: 'array', isActive: true, isListType: true }
      ]
    },

getDynamicPorts: (config: any) => {
  if (!config.properties || !Array.isArray(config.properties) || config.properties.length === 0) {
    return {
      inputs: [],
      outputs: []
    };
  }
  
  // Determine if results should be lists based on limit
  const isListOutput = !config.limit || parseInt(config.limit) > 1;
  
  // Generate output ports based on selected properties only
  const outputs = [];
  
  // Add ports for each selected property
  config.properties.forEach((propertyId: string) => {
    // Find the option to get its label
    const options = HUBSPOT_ACTIONS.COMPANY_READER.configFields.find(f => f.name === 'properties')?.options || [];
    
    // Find the matching option
    const option = options.find((opt: any) => opt.value === propertyId);
    
    // Use label if available, otherwise use the property ID
    const label = option ? option.label : propertyId.replace(/_/g, ' ');
    
    outputs.push({
      id: `output_${propertyId}`,
      label: label, 
      type: 'string',
      isActive: true,
      isListType: isListOutput
    });
  });
  
  return {
    inputs: [],
    outputs
  };
}
  }
  // Other HubSpot actions would be defined here
};