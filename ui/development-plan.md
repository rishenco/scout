# Scout Development Plan

## Overview
This document outlines the development plan for Scout, a Reddit post filtering application that uses LLMs to create customized feeds based on user criteria and categorize posts for easier search.

## Development Approach
- Iterative development with small, testable features
- Focus on delivering functional components that QA can verify
- Modular architecture allowing components to be built and tested independently

## Stage 1: Core Infrastructure Setup

### Step 1: Initialize react project, install modules

### Step 2: API Integration
- Create data models
- Create services for calling the api. Do not make actual requests, instead mock the behaviour in memory
- Implement TanStack Query hooks for all API endpoints
- Create data models matching API schemas

### Step 3: Base UI Components
- Implement common components:
  - ExtractedProperties viewer
  - Import other base ui elements that will surely be needed later from shadcn
  - Enable dark/light theme support based on browser settings (no need for switch in ui)
  - Add them to App.tsx to verify changes (can be removed after this stage)

## Stage 2: Profile Management

### Step 1: Profile Listing
- Implement Home page with ProfileList component
- Create ProfileCard component for displaying profile summaries
- Add navigation to individual profiles

### Step 2: Profile Creation
- Implement PromptInput component
- Build ProfileEditor component
- Create PropertiesEditor for property name/prompt pairs
- Connect form submission to API

## Stage 3: Post Feed Viewing

### Step 1: Post Feed
- Implement PostFeed component with pagination
- Create FeedFilters for filtering by relevance
- Build PostCard component to display Reddit-style posts

### Step 2: User Classification
- Add PostReaction component for user relevance feedback
- Implement API calls to store user classifications
- Create visual feedback for user classifications

## Stage 4: Profile Testing and Refinement

### Step 1: Test Runner Interface
- Implement TestRunner component
- Create TestStats component for displaying test results
- Build TestPostList for showing labeled posts

### Step 2: Profile Editing
- Enhance ProfileEditor for editing existing profiles

### Step 3: Test Results Visualization
- Create TestPostCard with expected vs. actual results
- Implement highlighting for failed tests

## Stage 5: Advanced Features and Refinements

### Step 1: Post Property Visualization
- Enhance visualization of extracted properties
- Add filtering by property values
- Implement sorting options for posts
