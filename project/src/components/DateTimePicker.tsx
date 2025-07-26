import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface DateTimePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  showQuickTimes?: boolean;
}

const QUICK_TIMES = [
  { label: 'Now', hours: 0, minutes: 0 },
  { label: '15 min', hours: 0, minutes: 15 },
  { label: '30 min', hours: 0, minutes: 30 },
  { label: '1 hour', hours: 1, minutes: 0 },
  { label: '2 hours', hours: 2, minutes: 0 },
  { label: 'Tomorrow 9 AM', hours: 9, minutes: 0, days: 1 },
  { label: 'Tomorrow 5 PM', hours: 17, minutes: 0, days: 1 },
];

export function DateTimePicker({
  date,
  onDateChange,
  label = "Date & Time",
  placeholder = "Pick a date and time",
  className,
  showQuickTimes = true
}: DateTimePickerProps) {
  const [selectedTime, setSelectedTime] = useState<string>('');

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      if (selectedTime) {
        const [hours, minutes] = selectedTime.split(':').map(Number);
        newDate.setHours(hours, minutes, 0, 0);
      }
      onDateChange(newDate);
    } else {
      onDateChange(undefined);
    }
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    if (date) {
      const [hours, minutes] = time.split(':').map(Number);
      const newDate = new Date(date);
      newDate.setHours(hours, minutes, 0, 0);
      onDateChange(newDate);
    }
  };

  const handleQuickTimeSelect = (quickTime: typeof QUICK_TIMES[0]) => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + (quickTime.days || 0));
    newDate.setHours(quickTime.hours, quickTime.minutes, 0, 0);
    onDateChange(newDate);
    setSelectedTime(`${quickTime.hours.toString().padStart(2, '0')}:${quickTime.minutes.toString().padStart(2, '0')}`);
  };

  const clearDateTime = () => {
    onDateChange(undefined);
    setSelectedTime('');
  };

  const formatDisplayDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow, ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy h:mm a');
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? formatDisplayDate(date) : placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                initialFocus
              />
              
              {date && (
                <div className="mt-3 pt-3 border-t">
                  <Label className="text-sm font-medium">Time</Label>
                  <Input
                    type="time"
                    value={selectedTime || format(date, 'HH:mm')}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}

              {showQuickTimes && (
                <div className="mt-3 pt-3 border-t">
                  <Label className="text-sm font-medium">Quick Times</Label>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {QUICK_TIMES.map((quickTime) => (
                      <Button
                        key={quickTime.label}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickTimeSelect(quickTime)}
                        className="text-xs"
                      >
                        {quickTime.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {date && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearDateTime}
            className="flex-shrink-0"
            title="Clear date and time"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
} 