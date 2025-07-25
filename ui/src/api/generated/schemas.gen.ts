// This file is auto-generated by @hey-api/openapi-ts

export const ErrorSchema = {
    type: 'object',
    properties: {
        error: {
            type: 'string'
        }
    },
    required: ['error']
} as const;

export const ProfileSchema = {
    type: 'object',
    properties: {
        id: {
            type: 'integer'
        },
        name: {
            type: 'string'
        },
        active: {
            type: 'boolean'
        },
        created_at: {
            type: 'string'
        },
        updated_at: {
            type: 'string'
        },
        default_settings: {
            '$ref': '#/components/schemas/ProfileSettings'
        },
        sources_settings: {
            type: 'object',
            additionalProperties: {
                '$ref': '#/components/schemas/ProfileSettings'
            }
        }
    },
    required: ['id', 'name', 'active']
} as const;

export const ProfileSettingsSchema = {
    type: 'object',
    properties: {
        version: {
            type: 'integer'
        },
        relevancy_filter: {
            type: 'string'
        },
        extracted_properties: {
            type: 'object',
            additionalProperties: {
                type: 'string'
            }
        },
        updated_at: {
            type: 'string'
        },
        created_at: {
            type: 'string'
        }
    },
    required: ['version', 'relevancy_filter', 'extracted_properties']
} as const;

export const ProfileJumpstartRequestSchema = {
    type: 'object',
    properties: {
        exclude_already_analyzed: {
            type: 'boolean',
            description: 'Whether to exclude already analyzed posts.',
            default: true
        },
        jumpstart_period: {
            type: 'integer',
            description: 'How many days to go back in time to analyze. If null, analyze all posts.',
            default: 30
        },
        limit: {
            type: 'integer',
            description: 'How many posts to analyze. If null, analyze all posts.',
            default: null
        }
    }
} as const;

export const ProfileUpdateSchema = {
    type: 'object',
    properties: {
        name: {
            type: 'string'
        },
        active: {
            type: 'boolean'
        },
        default_settings: {
            '$ref': '#/components/schemas/ProfileSettingsUpdate',
            nullable: true
        },
        sources_settings: {
            type: 'object',
            additionalProperties: {
                '$ref': '#/components/schemas/ProfileSettingsUpdate',
                nullable: true
            }
        }
    }
} as const;

export const ProfileSettingsUpdateSchema = {
    type: 'object',
    nullable: true,
    properties: {
        relevancy_filter: {
            type: 'string'
        },
        extracted_properties: {
            type: 'object',
            additionalProperties: {
                type: 'string',
                nullable: true
            }
        }
    }
} as const;

export const DetectionListRequestSchema = {
    type: 'object',
    properties: {
        last_seen_id: {
            type: 'integer'
        },
        limit: {
            type: 'integer',
            default: 10
        },
        filter: {
            '$ref': '#/components/schemas/DetectionFilter'
        }
    }
} as const;

export const DetectionFilterSchema = {
    type: 'object',
    properties: {
        profiles: {
            type: 'array',
            items: {
                '$ref': '#/components/schemas/ProfileFilter'
            }
        },
        sources: {
            type: 'array',
            items: {
                type: 'string'
            }
        },
        is_relevant: {
            type: 'boolean'
        },
        tags: {
            '$ref': '#/components/schemas/DetectionTagsFilter'
        }
    }
} as const;

export const ProfileFilterSchema = {
    type: 'object',
    properties: {
        profile_id: {
            type: 'integer'
        },
        source_settings_versions: {
            type: 'array',
            items: {
                '$ref': '#/components/schemas/SourceSettingsVersionsFilter'
            }
        }
    },
    required: ['profile_id', 'source_settings_versions']
} as const;

export const SourceSettingsVersionsFilterSchema = {
    type: 'object',
    properties: {
        source: {
            type: 'string'
        },
        versions: {
            type: 'array',
            items: {
                type: 'integer'
            }
        }
    },
    required: ['versions']
} as const;

export const DetectionTagsFilterSchema = {
    type: 'object',
    properties: {
        relevancy_detected_correctly: {
            type: 'array',
            items: {
                type: 'boolean',
                'x-go-type': '*bool'
            }
        }
    }
} as const;

export const DetectionTagsSchema = {
    type: 'object',
    properties: {
        relevancy_detected_correctly: {
            type: 'boolean'
        }
    }
} as const;

export const DetectionTagUpdateRequestSchema = {
    type: 'object',
    properties: {
        detection_id: {
            type: 'integer'
        },
        tags: {
            type: 'object',
            properties: {
                relevancy_detected_correctly: {
                    type: 'boolean',
                    nullable: true
                }
            }
        }
    },
    required: ['detection_id', 'tags']
} as const;

export const DetectionSchema = {
    type: 'object',
    properties: {
        id: {
            type: 'integer'
        },
        source: {
            type: 'string'
        },
        source_id: {
            type: 'string'
        },
        profile_id: {
            type: 'integer'
        },
        settings_version: {
            type: 'integer'
        },
        is_relevant: {
            type: 'boolean'
        },
        properties: {
            type: 'object',
            additionalProperties: {
                type: 'string'
            }
        },
        created_at: {
            type: 'string'
        }
    },
    required: ['id', 'source', 'source_id', 'profile_id', 'settings_version', 'is_relevant', 'properties', 'created_at']
} as const;

export const ListedDetectionSchema = {
    type: 'object',
    properties: {
        detection: {
            '$ref': '#/components/schemas/Detection'
        },
        source_post: {
            type: 'object',
            'x-go-type': 'json.RawMessage'
        },
        tags: {
            '$ref': '#/components/schemas/DetectionTags'
        }
    },
    required: ['detection']
} as const;

export const AnalyzeRequestSchema = {
    type: 'object',
    properties: {
        source: {
            type: 'string'
        },
        source_id: {
            type: 'string'
        },
        relevancy_filter: {
            type: 'string'
        },
        extracted_properties: {
            type: 'object',
            additionalProperties: {
                type: 'string'
            }
        }
    },
    required: ['source', 'source_id', 'relevancy_filter', 'extracted_properties']
} as const;

export const SubredditSettingsSchema = {
    type: 'object',
    properties: {
        subreddit: {
            type: 'string'
        },
        profiles: {
            type: 'array',
            items: {
                type: 'integer'
            }
        }
    },
    required: ['subreddit', 'profiles']
} as const;

export const ProfileStatisticsSchema = {
    type: 'object',
    properties: {
        manual_tasks: {
            type: 'integer'
        },
        auto_tasks: {
            type: 'integer'
        }
    },
    required: ['manual_tasks', 'auto_tasks']
} as const;

export const AnalysisTaskParametersSchema = {
    type: 'object',
    properties: {
        source: {
            type: 'string'
        },
        source_id: {
            type: 'string'
        },
        profile_id: {
            type: 'integer'
        },
        should_save: {
            type: 'boolean'
        }
    },
    required: ['source', 'source_id', 'profile_id', 'should_save']
} as const;