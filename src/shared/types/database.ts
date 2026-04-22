export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      anonymous_visits: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: string | null
          landing_page: string | null
          linked_at: string | null
          referrer: string | null
          session_token: string
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          landing_page?: string | null
          linked_at?: string | null
          referrer?: string | null
          session_token: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          landing_page?: string | null
          linked_at?: string | null
          referrer?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          read_at: string | null
          scout_id: string
          sender_id: string
          sender_role: Database["public"]["Enums"]["chat_sender_role"]
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          scout_id: string
          sender_id: string
          sender_role: Database["public"]["Enums"]["chat_sender_role"]
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          scout_id?: string
          sender_id?: string
          sender_role?: Database["public"]["Enums"]["chat_sender_role"]
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          city: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          employee_count_range: string | null
          id: string
          industry: string | null
          is_verified: boolean | null
          logo_url: string | null
          name: string
          phone: string | null
          postal_code: string | null
          prefecture: string | null
          street: string | null
          updated_at: string | null
          verified_at: string | null
          website_url: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          employee_count_range?: string | null
          id?: string
          industry?: string | null
          is_verified?: boolean | null
          logo_url?: string | null
          name: string
          phone?: string | null
          postal_code?: string | null
          prefecture?: string | null
          street?: string | null
          updated_at?: string | null
          verified_at?: string | null
          website_url?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          employee_count_range?: string | null
          id?: string
          industry?: string | null
          is_verified?: boolean | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          prefecture?: string | null
          street?: string | null
          updated_at?: string | null
          verified_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          last_sign_in_at: string | null
          role: Database["public"]["Enums"]["company_member_role"] | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          last_sign_in_at?: string | null
          role?: Database["public"]["Enums"]["company_member_role"] | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          last_sign_in_at?: string | null
          role?: Database["public"]["Enums"]["company_member_role"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_notification_settings: {
        Row: {
          chat_message: boolean | null
          company_member_id: string
          id: string
          in_app_enabled: boolean | null
          line_enabled: boolean | null
          scout_accepted: boolean | null
          scout_declined: boolean | null
          system_announcement: boolean | null
          updated_at: string | null
        }
        Insert: {
          chat_message?: boolean | null
          company_member_id: string
          id?: string
          in_app_enabled?: boolean | null
          line_enabled?: boolean | null
          scout_accepted?: boolean | null
          scout_declined?: boolean | null
          system_announcement?: boolean | null
          updated_at?: string | null
        }
        Update: {
          chat_message?: boolean | null
          company_member_id?: string
          id?: string
          in_app_enabled?: boolean | null
          line_enabled?: boolean | null
          scout_accepted?: boolean | null
          scout_declined?: boolean | null
          system_announcement?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_notification_settings_company_member_id_fkey"
            columns: ["company_member_id"]
            isOneToOne: true
            referencedRelation: "company_members"
            referencedColumns: ["id"]
          },
        ]
      }
      company_plans: {
        Row: {
          company_id: string
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_type: string | null
          scout_quota: number | null
          scouts_sent_this_month: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: string | null
          scout_quota?: number | null
          scouts_sent_this_month?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: string | null
          scout_quota?: number | null
          scouts_sent_this_month?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          applied_at: string | null
          cancelled_at: string | null
          created_at: string | null
          event_id: string
          id: string
          status:
            | Database["public"]["Enums"]["event_registration_status"]
            | null
          student_id: string
        }
        Insert: {
          applied_at?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          status?:
            | Database["public"]["Enums"]["event_registration_status"]
            | null
          student_id: string
        }
        Update: {
          applied_at?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          status?:
            | Database["public"]["Enums"]["event_registration_status"]
            | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "public_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "searchable_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          application_deadline: string | null
          capacity: number | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          ends_at: string | null
          event_type: string | null
          format: Database["public"]["Enums"]["event_format"]
          id: string
          is_published: boolean | null
          location: string | null
          online_url: string | null
          organizer_type: Database["public"]["Enums"]["event_organizer_type"]
          published_at: string | null
          starts_at: string
          target_graduation_year: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          application_deadline?: string | null
          capacity?: number | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          event_type?: string | null
          format?: Database["public"]["Enums"]["event_format"]
          id?: string
          is_published?: boolean | null
          location?: string | null
          online_url?: string | null
          organizer_type: Database["public"]["Enums"]["event_organizer_type"]
          published_at?: string | null
          starts_at: string
          target_graduation_year?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          application_deadline?: string | null
          capacity?: number | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          event_type?: string | null
          format?: Database["public"]["Enums"]["event_format"]
          id?: string
          is_published?: boolean | null
          location?: string | null
          online_url?: string | null
          organizer_type?: Database["public"]["Enums"]["event_organizer_type"]
          published_at?: string | null
          starts_at?: string
          target_graduation_year?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "company_members"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          benefits: string | null
          company_id: string
          created_at: string | null
          created_by: string
          deleted_at: string | null
          description: string | null
          employment_type: string | null
          id: string
          is_published: boolean | null
          job_category: string | null
          published_at: string | null
          requirements: string | null
          salary_range: string | null
          target_graduation_year: number | null
          title: string
          updated_at: string | null
          work_location: string | null
        }
        Insert: {
          benefits?: string | null
          company_id: string
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          description?: string | null
          employment_type?: string | null
          id?: string
          is_published?: boolean | null
          job_category?: string | null
          published_at?: string | null
          requirements?: string | null
          salary_range?: string | null
          target_graduation_year?: number | null
          title: string
          updated_at?: string | null
          work_location?: string | null
        }
        Update: {
          benefits?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          employment_type?: string | null
          id?: string
          is_published?: boolean | null
          job_category?: string | null
          published_at?: string | null
          requirements?: string | null
          salary_range?: string | null
          target_graduation_year?: number | null
          title?: string
          updated_at?: string | null
          work_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_postings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "company_members"
            referencedColumns: ["id"]
          },
        ]
      }
      mbti_types: {
        Row: {
          created_at: string | null
          id: string
          name_en: string
          name_ja: string
          type_code: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name_en: string
          name_ja: string
          type_code: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name_en?: string
          name_ja?: string
          type_code?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          line_sent_at: string | null
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          line_sent_at?: string | null
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          line_sent_at?: string | null
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          company_member_id: string
          created_at: string | null
          filters: Json
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          company_member_id: string
          created_at?: string | null
          filters: Json
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          company_member_id?: string
          created_at?: string | null
          filters?: Json
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_company_member_id_fkey"
            columns: ["company_member_id"]
            isOneToOne: false
            referencedRelation: "company_members"
            referencedColumns: ["id"]
          },
        ]
      }
      scouts: {
        Row: {
          company_id: string
          expires_at: string | null
          id: string
          job_posting_id: string
          message: string
          read_at: string | null
          responded_at: string | null
          sender_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["scout_status"] | null
          student_id: string
          subject: string
        }
        Insert: {
          company_id: string
          expires_at?: string | null
          id?: string
          job_posting_id: string
          message: string
          read_at?: string | null
          responded_at?: string | null
          sender_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["scout_status"] | null
          student_id: string
          subject: string
        }
        Update: {
          company_id?: string
          expires_at?: string | null
          id?: string
          job_posting_id?: string
          message?: string
          read_at?: string | null
          responded_at?: string | null
          sender_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["scout_status"] | null
          student_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "scouts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouts_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouts_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "company_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "public_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "searchable_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_integrated_profiles: {
        Row: {
          activity_level: Database["public"]["Enums"]["activity_level"] | null
          generated_at: string | null
          id: string
          interests: Json | null
          model_version: string | null
          preferred_work_locations: Json | null
          skills: Json | null
          strengths: Json | null
          student_id: string
          summary: string | null
        }
        Insert: {
          activity_level?: Database["public"]["Enums"]["activity_level"] | null
          generated_at?: string | null
          id?: string
          interests?: Json | null
          model_version?: string | null
          preferred_work_locations?: Json | null
          skills?: Json | null
          strengths?: Json | null
          student_id: string
          summary?: string | null
        }
        Update: {
          activity_level?: Database["public"]["Enums"]["activity_level"] | null
          generated_at?: string | null
          id?: string
          interests?: Json | null
          model_version?: string | null
          preferred_work_locations?: Json | null
          skills?: Json | null
          strengths?: Json | null
          student_id?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_integrated_profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "public_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_integrated_profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "searchable_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_integrated_profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notification_settings: {
        Row: {
          chat_message: boolean | null
          event_reminder: boolean | null
          id: string
          in_app_enabled: boolean | null
          line_enabled: boolean | null
          scout_received: boolean | null
          student_id: string
          system_announcement: boolean | null
          updated_at: string | null
        }
        Insert: {
          chat_message?: boolean | null
          event_reminder?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          line_enabled?: boolean | null
          scout_received?: boolean | null
          student_id: string
          system_announcement?: boolean | null
          updated_at?: string | null
        }
        Update: {
          chat_message?: boolean | null
          event_reminder?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          line_enabled?: boolean | null
          scout_received?: boolean | null
          student_id?: string
          system_announcement?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_notification_settings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "public_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_notification_settings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "searchable_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_notification_settings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_product_links: {
        Row: {
          external_user_id: string
          id: string
          linked_at: string | null
          product: Database["public"]["Enums"]["product_source"]
          student_id: string
        }
        Insert: {
          external_user_id: string
          id?: string
          linked_at?: string | null
          product: Database["public"]["Enums"]["product_source"]
          student_id: string
        }
        Update: {
          external_user_id?: string
          id?: string
          linked_at?: string | null
          product?: Database["public"]["Enums"]["product_source"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_product_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "public_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_product_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "searchable_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_product_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          academic_type: Database["public"]["Enums"]["academic_type"] | null
          bio: string | null
          birthdate: string | null
          city: string | null
          created_at: string | null
          data_consent_granted_at: string | null
          deleted_at: string | null
          department: string | null
          email: string
          faculty: string | null
          first_name: string | null
          first_name_kana: string | null
          gender: string | null
          graduation_year: number | null
          id: string
          is_profile_public: boolean | null
          last_name: string | null
          last_name_kana: string | null
          mbti_type_id: string | null
          phone: string | null
          postal_code: string | null
          prefecture: string | null
          profile_image_url: string | null
          street: string | null
          university: string | null
          updated_at: string | null
        }
        Insert: {
          academic_type?: Database["public"]["Enums"]["academic_type"] | null
          bio?: string | null
          birthdate?: string | null
          city?: string | null
          created_at?: string | null
          data_consent_granted_at?: string | null
          deleted_at?: string | null
          department?: string | null
          email: string
          faculty?: string | null
          first_name?: string | null
          first_name_kana?: string | null
          gender?: string | null
          graduation_year?: number | null
          id: string
          is_profile_public?: boolean | null
          last_name?: string | null
          last_name_kana?: string | null
          mbti_type_id?: string | null
          phone?: string | null
          postal_code?: string | null
          prefecture?: string | null
          profile_image_url?: string | null
          street?: string | null
          university?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_type?: Database["public"]["Enums"]["academic_type"] | null
          bio?: string | null
          birthdate?: string | null
          city?: string | null
          created_at?: string | null
          data_consent_granted_at?: string | null
          deleted_at?: string | null
          department?: string | null
          email?: string
          faculty?: string | null
          first_name?: string | null
          first_name_kana?: string | null
          gender?: string | null
          graduation_year?: number | null
          id?: string
          is_profile_public?: boolean | null
          last_name?: string | null
          last_name_kana?: string | null
          mbti_type_id?: string | null
          phone?: string | null
          postal_code?: string | null
          prefecture?: string | null
          profile_image_url?: string | null
          street?: string | null
          university?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_mbti_type_id_fkey"
            columns: ["mbti_type_id"]
            isOneToOne: false
            referencedRelation: "mbti_types"
            referencedColumns: ["id"]
          },
        ]
      }
      synced_compai_messages: {
        Row: {
          content: string | null
          external_message_id: string
          external_research_id: string
          external_user_id: string
          id: string
          original_created_at: string | null
          sender_type: string | null
          synced_at: string | null
        }
        Insert: {
          content?: string | null
          external_message_id: string
          external_research_id: string
          external_user_id: string
          id?: string
          original_created_at?: string | null
          sender_type?: string | null
          synced_at?: string | null
        }
        Update: {
          content?: string | null
          external_message_id?: string
          external_research_id?: string
          external_user_id?: string
          id?: string
          original_created_at?: string | null
          sender_type?: string | null
          synced_at?: string | null
        }
        Relationships: []
      }
      synced_compai_researches: {
        Row: {
          citations: Json | null
          content: string | null
          external_research_id: string
          external_user_id: string
          id: string
          is_bookmarked: boolean | null
          original_created_at: string | null
          raw_content: string | null
          status: string | null
          synced_at: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          citations?: Json | null
          content?: string | null
          external_research_id: string
          external_user_id: string
          id?: string
          is_bookmarked?: boolean | null
          original_created_at?: string | null
          raw_content?: string | null
          status?: string | null
          synced_at?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          citations?: Json | null
          content?: string | null
          external_research_id?: string
          external_user_id?: string
          id?: string
          is_bookmarked?: boolean | null
          original_created_at?: string | null
          raw_content?: string | null
          status?: string | null
          synced_at?: string | null
          title?: string | null
          url?: string | null
        }
        Relationships: []
      }
      synced_compai_users: {
        Row: {
          email: string | null
          external_user_id: string
          id: string
          original_created_at: string | null
          synced_at: string | null
        }
        Insert: {
          email?: string | null
          external_user_id: string
          id?: string
          original_created_at?: string | null
          synced_at?: string | null
        }
        Update: {
          email?: string | null
          external_user_id?: string
          id?: string
          original_created_at?: string | null
          synced_at?: string | null
        }
        Relationships: []
      }
      synced_interviewai_searches: {
        Row: {
          company_name: string | null
          external_search_id: string
          external_user_id: string
          id: string
          searched_at: string | null
          synced_at: string | null
        }
        Insert: {
          company_name?: string | null
          external_search_id: string
          external_user_id: string
          id?: string
          searched_at?: string | null
          synced_at?: string | null
        }
        Update: {
          company_name?: string | null
          external_search_id?: string
          external_user_id?: string
          id?: string
          searched_at?: string | null
          synced_at?: string | null
        }
        Relationships: []
      }
      synced_interviewai_sessions: {
        Row: {
          areas_for_improvement: Json | null
          company_name: string | null
          conversation_text: Json | null
          external_session_id: string
          external_user_id: string
          growth_hint: string | null
          id: string
          industry: string | null
          original_created_at: string | null
          overall_score: number | null
          phase: string | null
          session_type: string | null
          skill_scores: Json | null
          started_at: string | null
          status: string | null
          strengths: Json | null
          synced_at: string | null
        }
        Insert: {
          areas_for_improvement?: Json | null
          company_name?: string | null
          conversation_text?: Json | null
          external_session_id: string
          external_user_id: string
          growth_hint?: string | null
          id?: string
          industry?: string | null
          original_created_at?: string | null
          overall_score?: number | null
          phase?: string | null
          session_type?: string | null
          skill_scores?: Json | null
          started_at?: string | null
          status?: string | null
          strengths?: Json | null
          synced_at?: string | null
        }
        Update: {
          areas_for_improvement?: Json | null
          company_name?: string | null
          conversation_text?: Json | null
          external_session_id?: string
          external_user_id?: string
          growth_hint?: string | null
          id?: string
          industry?: string | null
          original_created_at?: string | null
          overall_score?: number | null
          phase?: string | null
          session_type?: string | null
          skill_scores?: Json | null
          started_at?: string | null
          status?: string | null
          strengths?: Json | null
          synced_at?: string | null
        }
        Relationships: []
      }
      synced_interviewai_users: {
        Row: {
          email: string | null
          external_user_id: string
          id: string
          original_created_at: string | null
          synced_at: string | null
        }
        Insert: {
          email?: string | null
          external_user_id: string
          id?: string
          original_created_at?: string | null
          synced_at?: string | null
        }
        Update: {
          email?: string | null
          external_user_id?: string
          id?: string
          original_created_at?: string | null
          synced_at?: string | null
        }
        Relationships: []
      }
      synced_smartes_gakuchika: {
        Row: {
          external_gakuchika_id: string
          external_user_id: string
          generated_at: string | null
          generated_params: Json | null
          generated_text: string | null
          id: string
          original_created_at: string | null
          original_gakuchika_list: Json | null
          regenerated_count: number | null
          synced_at: string | null
        }
        Insert: {
          external_gakuchika_id: string
          external_user_id: string
          generated_at?: string | null
          generated_params?: Json | null
          generated_text?: string | null
          id?: string
          original_created_at?: string | null
          original_gakuchika_list?: Json | null
          regenerated_count?: number | null
          synced_at?: string | null
        }
        Update: {
          external_gakuchika_id?: string
          external_user_id?: string
          generated_at?: string | null
          generated_params?: Json | null
          generated_text?: string | null
          id?: string
          original_created_at?: string | null
          original_gakuchika_list?: Json | null
          regenerated_count?: number | null
          synced_at?: string | null
        }
        Relationships: []
      }
      synced_smartes_generated_es: {
        Row: {
          external_es_id: string
          external_user_id: string
          generated_at: string | null
          generated_params: Json | null
          generated_text: string | null
          id: string
          original_created_at: string | null
          original_es_list: Json | null
          regenerated_count: number | null
          synced_at: string | null
        }
        Insert: {
          external_es_id: string
          external_user_id: string
          generated_at?: string | null
          generated_params?: Json | null
          generated_text?: string | null
          id?: string
          original_created_at?: string | null
          original_es_list?: Json | null
          regenerated_count?: number | null
          synced_at?: string | null
        }
        Update: {
          external_es_id?: string
          external_user_id?: string
          generated_at?: string | null
          generated_params?: Json | null
          generated_text?: string | null
          id?: string
          original_created_at?: string | null
          original_es_list?: Json | null
          regenerated_count?: number | null
          synced_at?: string | null
        }
        Relationships: []
      }
      synced_smartes_motivations: {
        Row: {
          external_motivation_id: string
          external_user_id: string
          generated_at: string | null
          generated_params: Json | null
          generated_text: string | null
          id: string
          original_created_at: string | null
          regenerated_count: number | null
          synced_at: string | null
        }
        Insert: {
          external_motivation_id: string
          external_user_id: string
          generated_at?: string | null
          generated_params?: Json | null
          generated_text?: string | null
          id?: string
          original_created_at?: string | null
          regenerated_count?: number | null
          synced_at?: string | null
        }
        Update: {
          external_motivation_id?: string
          external_user_id?: string
          generated_at?: string | null
          generated_params?: Json | null
          generated_text?: string | null
          id?: string
          original_created_at?: string | null
          regenerated_count?: number | null
          synced_at?: string | null
        }
        Relationships: []
      }
      synced_smartes_users: {
        Row: {
          email: string | null
          external_user_id: string
          id: string
          original_created_at: string | null
          synced_at: string | null
        }
        Insert: {
          email?: string | null
          external_user_id: string
          id?: string
          original_created_at?: string | null
          synced_at?: string | null
        }
        Update: {
          email?: string | null
          external_user_id?: string
          id?: string
          original_created_at?: string | null
          synced_at?: string | null
        }
        Relationships: []
      }
      synced_sugoshu_diagnoses: {
        Row: {
          diagnosis_data: Json | null
          external_diagnosis_id: string | null
          external_user_id: string
          id: string
          original_created_at: string | null
          synced_at: string | null
        }
        Insert: {
          diagnosis_data?: Json | null
          external_diagnosis_id?: string | null
          external_user_id: string
          id?: string
          original_created_at?: string | null
          synced_at?: string | null
        }
        Update: {
          diagnosis_data?: Json | null
          external_diagnosis_id?: string | null
          external_user_id?: string
          id?: string
          original_created_at?: string | null
          synced_at?: string | null
        }
        Relationships: []
      }
      synced_sugoshu_resumes: {
        Row: {
          content: string | null
          external_resume_id: string | null
          external_user_id: string
          id: string
          original_created_at: string | null
          synced_at: string | null
        }
        Insert: {
          content?: string | null
          external_resume_id?: string | null
          external_user_id: string
          id?: string
          original_created_at?: string | null
          synced_at?: string | null
        }
        Update: {
          content?: string | null
          external_resume_id?: string | null
          external_user_id?: string
          id?: string
          original_created_at?: string | null
          synced_at?: string | null
        }
        Relationships: []
      }
      synced_sugoshu_users: {
        Row: {
          email: string | null
          external_user_id: string
          id: string
          original_created_at: string | null
          synced_at: string | null
        }
        Insert: {
          email?: string | null
          external_user_id: string
          id?: string
          original_created_at?: string | null
          synced_at?: string | null
        }
        Update: {
          email?: string | null
          external_user_id?: string
          id?: string
          original_created_at?: string | null
          synced_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      public_students: {
        Row: {
          academic_type: Database["public"]["Enums"]["academic_type"] | null
          bio: string | null
          department: string | null
          faculty: string | null
          graduation_year: number | null
          id: string | null
          prefecture: string | null
          profile_image_url: string | null
          university: string | null
        }
        Insert: {
          academic_type?: Database["public"]["Enums"]["academic_type"] | null
          bio?: string | null
          department?: string | null
          faculty?: string | null
          graduation_year?: number | null
          id?: string | null
          prefecture?: string | null
          profile_image_url?: string | null
          university?: string | null
        }
        Update: {
          academic_type?: Database["public"]["Enums"]["academic_type"] | null
          bio?: string | null
          department?: string | null
          faculty?: string | null
          graduation_year?: number | null
          id?: string | null
          prefecture?: string | null
          profile_image_url?: string | null
          university?: string | null
        }
        Relationships: []
      }
      searchable_students: {
        Row: {
          academic_type: Database["public"]["Enums"]["academic_type"] | null
          activity_level: Database["public"]["Enums"]["activity_level"] | null
          bio: string | null
          faculty: string | null
          graduation_year: number | null
          id: string | null
          interests: Json | null
          prefecture: string | null
          preferred_work_locations: Json | null
          profile_image_url: string | null
          skills: Json | null
          strengths: Json | null
          summary: string | null
          university: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_company_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      is_company_verified: { Args: never; Returns: boolean }
    }
    Enums: {
      academic_type: "liberal_arts" | "science" | "other"
      activity_level: "low" | "medium" | "high" | "very_high"
      chat_sender_role: "student" | "company_member"
      company_member_role: "owner" | "admin" | "member"
      event_format: "online" | "offline" | "hybrid"
      event_organizer_type: "company" | "platform"
      event_registration_status:
        | "applied"
        | "confirmed"
        | "cancelled"
        | "attended"
      notification_type:
        | "scout_received"
        | "scout_accepted"
        | "scout_declined"
        | "chat_new_message"
        | "event_reminder"
        | "system_announcement"
      product_source: "smartes" | "compai" | "interviewai" | "sugoshu"
      scout_status: "sent" | "read" | "accepted" | "declined" | "expired"
      user_role:
        | "student"
        | "company_owner"
        | "company_admin"
        | "company_member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      academic_type: ["liberal_arts", "science", "other"],
      activity_level: ["low", "medium", "high", "very_high"],
      chat_sender_role: ["student", "company_member"],
      company_member_role: ["owner", "admin", "member"],
      event_format: ["online", "offline", "hybrid"],
      event_organizer_type: ["company", "platform"],
      event_registration_status: [
        "applied",
        "confirmed",
        "cancelled",
        "attended",
      ],
      notification_type: [
        "scout_received",
        "scout_accepted",
        "scout_declined",
        "chat_new_message",
        "event_reminder",
        "system_announcement",
      ],
      product_source: ["smartes", "compai", "interviewai", "sugoshu"],
      scout_status: ["sent", "read", "accepted", "declined", "expired"],
      user_role: [
        "student",
        "company_owner",
        "company_admin",
        "company_member",
      ],
    },
  },
} as const

