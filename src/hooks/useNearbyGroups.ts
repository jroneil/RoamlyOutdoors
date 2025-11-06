import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchNearbyGroups } from '../services/nearbyGroupsService';
import { createNearbyGroupsHook } from './createNearbyGroupsHook';

export const useNearbyGroups = createNearbyGroupsHook({
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  fetchNearbyGroupsImpl: fetchNearbyGroups
});

export type { NearbyGroupsHook, NearbyGroupsStatus } from './createNearbyGroupsHook';
