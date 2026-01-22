package Web::Components::LeakChecker;

use Devel::Cycle qw( find_cycle -quiet );
use Scalar::Util qw( weaken );
use B::Deparse;
use Try::Tiny;
use Moo::Role;

=pod

=encoding utf-8

=head1 Name

Web::Components::LeakChecker - Check for memory leaks in the context object

=head1 Synopsis

   use Moo;

   with 'Web::Components::LeakChecker';

=head1 Description

Check for memory leaks in the context object

=head1 Configuration and Environment

Defines no attributes

=over 3

=back

=head1 Subroutines/Methods

Defines the following methods;

=over 3

=item C<finalise>

Modifies the method in the consuming class. Does nothing unless the environment
variable C<WEB_COMPONENTS_LEAK_CHECK> is true. If leaks are found log them
at the debug level

=cut

around 'finalise' => sub {
   my ($orig, $self, $context) = @_;

   return unless $ENV{WEB_COMPONENTS_LEAK_CHECK};

   my $weak_context = $context; weaken $weak_context;
   my @leaks;

   find_cycle($context, sub {
      my $path = shift;

      push @leaks, $path if $path->[0]->[2] == $weak_context;
   });

   $self->_found_leaks($context, @leaks) if @leaks;

   return;
};

# Private methods
sub _found_leaks {
   my ($self, $context, @leaks) = @_;

   $self->log->debug('Circular reference detected', $context);

   my $sym = 'a';

   for my $leak (@leaks) {
      $self->log->debug(_format_leak($leak, \$sym), $context);
   }

   return;
}

# Private functions
sub _deparse {
   my $coderef = shift;
   my $text;

   try   { $text = 'sub ' . B::Deparse->new->coderef2text($coderef) . ';' }
   catch { $text = substr $_, 0, 256 };

   return $text;
}

sub _format_leak {
   my ($leak, $sym) = @_;

   my $ret = '$ctx';
   my @lines;

   for my $element (@{$leak}) {
      my ($type, $index, $ref, $val, $weak) = @{$element};

      die $type if $weak;

      if    ($type eq 'ARRAY')  { $ret .= qq(->[$index]) }
      elsif ($type eq 'HASH')   { $ret .= qq(->{$index}) }
      elsif ($type eq 'SCALAR') { $ret  = qq(\${ ${ret} }) }
      elsif ($type eq 'CODE') {
         push @lines, qq(\$${$sym} = ${ret};);
         push @lines, qq{Code ref \$${$sym} deparses to: } . _deparse($ref);
         $ret = qq($index);
         ${$sym}++;
      }
   }

   return join "\n" => @lines, $ret;
}

use namespace::autoclean;

1;

__END__

=back

=head1 Diagnostics

None

=head1 Dependencies

=over 3

=item L<B::Deparse>

=item L<Devel::Cycle>

=back

=head1 Incompatibilities

There are no known incompatibilities in this module

=head1 Bugs and Limitations

There are no known bugs in this module. Please report problems to
http://rt.cpan.org/NoAuth/Bugs.html?Dist=Web-Components.
Patches are welcome

=head1 Acknowledgements

Larry Wall - For the Perl programming language

=head1 Author

Peter Flanigan, C<< <pjfl@cpan.org> >>

=head1 License and Copyright

Copyright (c) 2026 Peter Flanigan. All rights reserved

This program is free software; you can redistribute it and/or modify it
under the same terms as Perl itself. See L<perlartistic>

This program is distributed in the hope that it will be useful,
but WITHOUT WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE

=cut

# Local Variables:
# mode: perl
# tab-width: 3
# End:
# vim: expandtab shiftwidth=3:
