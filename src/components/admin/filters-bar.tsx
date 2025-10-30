'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface FilterConfig {
  type: 'select' | 'date-range' | 'search';
  label: string;
  value: any;
  onChange: (value: any) => void;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface FiltersBarProps {
  filters: FilterConfig[];
  onReset?: () => void;
}

export function FiltersBar({ filters, onReset }: FiltersBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/50 rounded-lg">
      {filters.map((filter, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Label className="text-sm font-medium">{filter.label}</Label>

          {filter.type === 'select' && (
            <Select value={filter.value} onValueChange={filter.onChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={filter.placeholder || 'Select...'} />
              </SelectTrigger>
              <SelectContent>
                {filter.options?.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {filter.type === 'date-range' && (
            <DateRangeFilter
              value={filter.value}
              onChange={filter.onChange}
              placeholder={filter.placeholder}
            />
          )}

          {filter.type === 'search' && (
            <Input
              type="text"
              value={filter.value}
              onChange={e => filter.onChange(e.target.value)}
              placeholder={filter.placeholder || 'Search...'}
              className="w-[200px]"
            />
          )}
        </div>
      ))}

      {onReset && (
        <Button variant="outline" onClick={onReset}>
          Reset Filters
        </Button>
      )}
    </div>
  );
}

interface DateRangeFilterProps {
  value: { from?: Date; to?: Date };
  onChange: (value: { from?: Date; to?: Date }) => void;
  placeholder?: string;
}

function DateRangeFilter({ value, onChange, placeholder }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (field: 'from' | 'to') => (date: Date | undefined) => {
    onChange({
      ...value,
      [field]: date,
    });
  };

  const hasValue = value.from || value.to;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-[280px] justify-start text-left font-normal',
            !hasValue && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {hasValue ? (
            <>
              {value.from ? format(value.from, 'PP') : 'Start'} -{' '}
              {value.to ? format(value.to, 'PP') : 'End'}
            </>
          ) : (
            <span>{placeholder || 'Select date range'}</span>
          )}
          {hasValue && (
            <X
              className="ml-auto h-4 w-4"
              onClick={e => {
                e.stopPropagation();
                onChange({ from: undefined, to: undefined });
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex gap-2 p-3">
          <div>
            <p className="text-sm font-medium mb-2">From</p>
            <Calendar
              mode="single"
              selected={value.from}
              onSelect={handleSelect('from')}
              initialFocus
            />
          </div>
          <div>
            <p className="text-sm font-medium mb-2">To</p>
            <Calendar mode="single" selected={value.to} onSelect={handleSelect('to')} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
